import * as fs from "fs";
import * as path from "path";
import * as gltf from "./GLTF";
import * as shaderConfig from "./ShaderConfig";
export function createConfig() {
    const config = {
        version: "3",
        asset: {
            version: "2.0"
        },
        extensions: {},
        extensionsRequired: ["paper", "KHR_techniques_webgl"],
        extensionsUsed: ["paper", "KHR_techniques_webgl"],
    } as gltf.GLTFEgret;

    return config;
}

export function createGLTFExtensionsConfig() {
    const config = createConfig();
    config.extensions = {
        KHR_techniques_webgl: {
            shaders: [],
            techniques: [],
        },
        paper: {},
    };

    return config;
}
export function filterFileList(folderPath: string, filter?: RegExp, maxDepth: number = 0, currentDepth: number = 0): string[] {
    let fileFilteredList = [] as string[];
    if (folderPath && fs.existsSync(folderPath)) {
        for (const file of fs.readdirSync(folderPath)) {
            const filePath = path.resolve(folderPath, file);
            const fileStatus = fs.lstatSync(filePath);
            if (fileStatus.isDirectory()) {
                if (maxDepth === 0 || currentDepth <= maxDepth) {
                    fileFilteredList = fileFilteredList.concat(filterFileList(filePath, filter, currentDepth + 1));
                }
            }
            else if (!filter || filter.test(filePath)) {
                fileFilteredList.push(filePath);
            }
        }
    }

    return fileFilteredList;
}

export function parseIncludes(string: string, shaderChunks: { [key: string]: string }): string {
    const pattern = /#include +<([\w\d.]+)>/g;
    //
    function replace(_match: string, include: string) {
        const replace = shaderChunks[include];
        if (replace === undefined) {
            throw new Error('Can not resolve #include <' + include + '>');
        }

        return parseIncludes(replace, shaderChunks);
    }
    //
    return string.replace(pattern, replace);
}


export function parseAttributeName(string: string): string {
    if (string.indexOf("attribute") >= 0) {
        return string.substring(string.lastIndexOf(" ") + 1, string.length - 1);
    }
    console.error(" 未知的的Attribute:" + string);
    return "";
}

export function parseUniformName(string: string): string {
    if (string.indexOf("uniform") >= 0) {
        //
        if (string.indexOf("[") >= 0) {
            string = string.substring(0, string.indexOf("["));
            return string.substring(string.lastIndexOf(" ") + 1, string.length) + "[0]";
        }
        else {
            return string.substring(string.lastIndexOf(" ") + 1, string.length - 1);
        }
    }
    console.error(" 未知的的Uniform:" + string);
    return "";
}

export function parseUniformType(string: string, name: string): gltf.UniformType {
    for (const key in shaderConfig.UNIFORM_TYPE_MAP) {
        if (string.indexOf(key) >= 0) {
            return shaderConfig.UNIFORM_TYPE_MAP[key];
        }
    }
    console.log("   不支持的Uniform类型:" + name);
    return gltf.UniformType.STRUCT;
}

export function parseAttribute(name: string): gltf.Attribute | null {
    const attribute: gltf.Attribute = { semantic: "Unknown" };
    //系统内置的
    if (name in shaderConfig.ATTRIBUTE_TEMPLATE) {
        // attribute.semantic = shaderConfig.ATTRIBUTE_TEMPLATE[name];
        return null;
    }
    //用户自定义的
    else if (name in shaderConfig.CUSTOM_ATTRIBUTE_TEMPLATE) {
        attribute.semantic = shaderConfig.CUSTOM_ATTRIBUTE_TEMPLATE[name];
    }

    return attribute;
}

export function parseUniform(string: string, name: string): gltf.Uniform | null {
    const uniform: gltf.Uniform = { type: gltf.UniformType.INT };
    //系统内置的
    if (name in shaderConfig.UNIFORM_TEMPLATE) {
        if (shaderConfig.UNIFORM_TEMPLATE[name].semantic) {
            return null;
        }
        // if (shaderConfig.UNIFORM_TEMPLATE[name].semantic) {
        //     uniform.semantic = shaderConfig.UNIFORM_TEMPLATE[name].semantic;
        // }
        // else {
        //     uniform.value = [];
        // }
        if (shaderConfig.UNIFORM_TEMPLATE[name].value) {
            uniform.value = shaderConfig.UNIFORM_TEMPLATE[name].value;
        }
    }
    //用户自定义的
    else if (name in shaderConfig.CUSTOM_UNIFORM_TEMPLATE) {
        if (shaderConfig.CUSTOM_UNIFORM_TEMPLATE[name].semantic) {
            uniform.semantic = shaderConfig.CUSTOM_UNIFORM_TEMPLATE[name].semantic;
        }
        else {
            uniform.value = [];
        }
        if (shaderConfig.CUSTOM_UNIFORM_TEMPLATE[name].value) {
            uniform.value = shaderConfig.CUSTOM_UNIFORM_TEMPLATE[name].value;
        }
    }
    else {
        console.log("   没有设置默认值:" + name);
        // uniform.value = [];
    }

    uniform.type = parseUniformType(string, name) as any;

    return uniform;
}

export function parseShader(file: string) {
    var buffer = fs.readFileSync(file);
    var string = buffer.toString()
        .replace(/\r\n/g, '\n') // for windows
        .replace(/\n/g, '\n') // for windows
        .replace(/\r/g, '\n') // for windows
        .replace(/\t/g, ' ') // for windows;

    return string;
}