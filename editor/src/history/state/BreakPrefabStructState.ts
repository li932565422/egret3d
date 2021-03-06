namespace paper.editor {

    type Info = { uuid: string, linkid?: string, rootid?: string, prefab?: string, components: { uuid: string, linkid?: string }[] };
    /**
     * 预置体结构状态
     * @author 杨宁
     */
    export class BreakPrefabStructState extends BaseState {

        public static create(prefabInstanceList: GameObject[]): BreakPrefabStructState {
            let instance: BreakPrefabStructState = new BreakPrefabStructState();
            instance.prefabInfos = [];
            prefabInstanceList.forEach(obj => {
                for (let info of instance.prefabInfos) {
                    if (info.uuid === obj.uuid)
                        return;
                }
                instance.prefabInfos = instance.prefabInfos.concat(this.makePrefabInfo(obj));
            })
            return instance;
        }
        private static makePrefabInfo(gameOjbect: GameObject): Info[] {
            let isPrefabRoot = (gameObj: GameObject): boolean => {
                if (gameObj.extras && gameObj.extras.prefab) {
                    return true;
                }
                return false;
            }
            let isPrefabChild = (gameObj: GameObject): boolean => {
                if (gameObj.extras && gameObj.extras.rootID) {
                    return true;
                }
                return false;
            }

            let makeInfo = (target: GameObject, result: Info[] = []) => {
                result.push({
                    uuid: target.uuid,
                    linkid: target.extras!.linkedID,
                    rootid: target.extras!.rootID,
                    prefab: target.extras!.prefab ? target.extras!.prefab!.name : undefined,
                    components: (() => {
                        let list = [];
                        for (let comp of target.components) {
                            if (comp.extras && comp.extras.linkedID) {
                                list.push({ uuid: comp.uuid, linkid: comp.extras.linkedID })
                            }
                        }
                        return list
                    })()
                });
                target.transform.children.forEach(transform => {
                    let obj = transform.gameObject;
                    if (isPrefabChild(obj) && !isPrefabRoot(obj)) {
                        makeInfo(obj, result);
                    }
                });
            }
            let target: GameObject = gameOjbect;
            let infos: Info[] = [];
            while (target) {
                if (isPrefabRoot(target)) {
                    makeInfo(target, infos);
                    break;
                }
                if (target.transform.parent)
                    target = target.transform.parent.gameObject;
                else
                    break;
            }
            return infos;
        }

        private prefabInfos: Info[] = [];

        public redo(): boolean {
            let ids = this.prefabInfos.map(prefabInfos => { return prefabInfos.uuid });
            let objs = this.editorModel.getGameObjectsByUUids(ids);
            objs.forEach(obj => {
                obj.extras!.linkedID = undefined;
                obj.extras!.prefab = undefined;
                obj.extras!.rootID = undefined;
                for(let comp of obj.components){
                    if(comp.extras&&comp.extras.linkedID){
                        comp.extras.linkedID=undefined;
                    }
                }
                this.dispatchEditorModelEvent(EditorModelEvent.CHANGE_PROPERTY, { target: obj, propName: ['prefab'], propValue: null });
            });
            return true;
        }
        public undo(): boolean {
            let all = this.editorModel.scene.gameObjects;
            for (let i: number = 0; i < all.length; i++) {
                let obj = all[i];
                b: for (let k: number = 0; k < this.prefabInfos.length; k++) {
                    let info = this.prefabInfos[k];
                    if (obj.uuid === info.uuid) {
                        obj.extras!.linkedID = info.linkid;
                        obj.extras!.prefab = info.prefab ? paper.Asset.find(info.prefab!) as paper.Prefab : undefined;
                        obj.extras!.rootID = info.rootid;
                        for (let comp of obj.components) {
                            c:for (let compInfo of info.components) {
                                if (comp.uuid === compInfo.uuid) {
                                    comp.extras!.linkedID = compInfo.linkid;
                                    break c;
                                }
                            }
                        }
                        this.dispatchEditorModelEvent(EditorModelEvent.CHANGE_PROPERTY, { target: obj, propName: ['prefab'], propValue: obj.extras!.prefab });
                        break b;
                    }
                }
            }
            return true;
        }
        public serialize(): any {
            return this.prefabInfos;
        }
        public deserialize(data: any): void {
            this.prefabInfos = data;
        }
    }
}