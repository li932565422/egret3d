namespace egret3d.web {
    /**
     * @internal
     */
    export class WebGLMesh extends Mesh {
        public readonly ibos: (WebGLBuffer | null)[] = [];
        public vbo: WebGLBuffer | null = null;

        public dispose() {
            if (!super.dispose()) {
                return false;
            }

            if (this.vbo) {
                const webgl = WebGLCapabilities.webgl!;

                for (const ibo of this.ibos) {
                    ibo && webgl.deleteBuffer(ibo);
                }

                webgl.deleteBuffer(this.vbo);
            }

            this.ibos.length = 0;
            this.vbo = null;

            return true;
        }

        public createBuffer() {
            const vertexBufferViewAccessor = this.getAccessor(this._glTFMesh!.primitives[0].attributes.POSITION || 0);
            const vertexBuffer = this.createTypeArrayFromBufferView(this.getBufferView(vertexBufferViewAccessor), gltf.ComponentType.Float);
            const webgl = WebGLCapabilities.webgl!;
            const vbo = webgl.createBuffer();

            if (vbo) {
                this.vbo = vbo;

                const attributeNames: gltf.MeshAttribute[] = [];
                for (const k in this._glTFMesh!.primitives[0].attributes) {
                    attributeNames.push(k);
                }

                let subMeshIndex = 0;
                for (const primitive of this._glTFMesh!.primitives) {
                    if (primitive.indices !== undefined) {
                        const ibo = webgl.createBuffer();
                        if (ibo) {
                            this.ibos[subMeshIndex] = ibo;
                            webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, ibo);
                            webgl.bufferData(webgl.ELEMENT_ARRAY_BUFFER, this.getBufferLength(this.getAccessor(primitive.indices)), this.drawMode);
                            this.uploadSubIndexBuffer(subMeshIndex);
                        }
                        else {
                            this.ibos[subMeshIndex] = null;
                            console.error("Create webgl element buffer error.");
                        }
                    }
                    
                    subMeshIndex++;
                }

                webgl.bindBuffer(webgl.ARRAY_BUFFER, this.vbo);
                webgl.bufferData(webgl.ARRAY_BUFFER, vertexBuffer.byteLength, this.drawMode);
                this.uploadVertexBuffer(attributeNames);
            }
            else {
                console.error("Create webgl buffer error.");
            }
        }

        public uploadVertexBuffer(uploadAttributes: gltf.MeshAttribute | (gltf.MeshAttribute[]) | null = null, offset: number = 0, count: number = 0) {
            if (!this.vbo) {
                return;
            }

            const { attributes } = this._glTFMesh!.primitives[0];
            const webgl = WebGLCapabilities.webgl!;
            webgl.bindBuffer(webgl.ARRAY_BUFFER, this.vbo);

            if (!uploadAttributes) {
                uploadAttributes = [];
                for (const attributeName in this._glTFMesh!.primitives[0].attributes) {
                    uploadAttributes.push(attributeName);
                }
            }

            if (Array.isArray(uploadAttributes)) {
                for (const attributeName of uploadAttributes) {
                    const accessorIndex = attributes[attributeName];
                    if (accessorIndex !== undefined) {
                        const accessor = this.getAccessor(accessorIndex);
                        let bufferOffset = this.getBufferOffset(accessor);
                        const subVertexBuffer = this.createTypeArrayFromAccessor(accessor, offset, count);
                        if (offset > 0) {
                            const accessorTypeCount = this.getAccessorTypeCount(accessor.type);
                            bufferOffset += offset * accessorTypeCount * this.getComponentTypeCount(accessor.componentType);
                        }
                        webgl.bufferSubData(webgl.ARRAY_BUFFER, bufferOffset, subVertexBuffer);
                    }
                    else {
                        console.warn("Error arguments.");
                    }
                }
            }
            else {
                const accessorIndex = attributes[uploadAttributes];
                if (accessorIndex !== undefined) {
                    const accessor = this.getAccessor(accessorIndex);
                    const bufferOffset = this.getBufferOffset(accessor);
                    const subVertexBuffer = this.createTypeArrayFromAccessor(accessor);
                    webgl.bufferSubData(webgl.ARRAY_BUFFER, bufferOffset, subVertexBuffer);
                }
                else {
                    console.warn("Error arguments.");
                }
            }
        }

        public uploadSubIndexBuffer(subMeshIndex: number = 0) {
            if (!this.vbo) {
                return;
            }

            if (0 <= subMeshIndex && subMeshIndex < this._glTFMesh!.primitives.length) {
                const primitive = this._glTFMesh!.primitives[subMeshIndex];

                if (primitive.indices !== undefined) {
                    const accessor = this.getAccessor(primitive.indices);
                    const subIndexBuffer = this.createTypeArrayFromAccessor(accessor);
                    const ibo = this.ibos[subMeshIndex];
                    const webgl = WebGLCapabilities.webgl!;
                    webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, ibo);
                    webgl.bufferSubData(webgl.ELEMENT_ARRAY_BUFFER, 0, subIndexBuffer);
                }
                else {
                    console.warn("Error arguments.");
                }
            }
            else {
                console.warn("Error arguments.");
            }
        }
    }
    // Retarget.
    egret3d.Mesh = WebGLMesh;
}