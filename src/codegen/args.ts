import { camelCase, constantCase } from "change-case";
import { partition } from "../collections.ts";
import { Argument, InputData } from "../models";
import {
    getAttribution,
    imports,
    isArrayParam,
    isForQueryParam,
    isNullableAsParam,
    resolveNavType,
} from "./shared.ts";

function argConstName(data: InputData, arg: Argument): string {
    return constantCase(data.name + "Arg_" + arg.name);
}

function generateRoute(pathConstName: string, data: InputData): string {
    let result = "$" + pathConstName;
    const queryParams: Argument[] = [];
    for (const arg of data.args) {
        if (isForQueryParam(arg)) {
            queryParams.push(arg);
            continue;
        }
        if (!result.endsWith("/")) {
            result += "/";
        }
        result += `{$${argConstName(data, arg)}}`;
    }
    if (queryParams.length > 0) {
        result += "?";
    }
    for (const arg of queryParams) {
        result += `$${argConstName(data, arg)}={$${argConstName(data, arg)}}&`;
    }
    if (result.endsWith("&")) {
        return result.substring(0, result.length - 1);
    } else {
        return result;
    }
}

function generateStringBuilderCode(
    navExtParameterCode: string,
    pathConstName: string,
    data: InputData,
): string {
    const indent = "    ";
    let result = `private fun buildRoute(
${navExtParameterCode}
): String = buildString {
${indent}append(${pathConstName})
${indent}if (!endsWith('/')) append('/')
`;

    const [queryParams, pathParams] = partition(data.args, isForQueryParam);
    for (let i = 0; i < pathParams.length; i++) {
        const arg = pathParams[i];
        result += `${indent}append(${arg.name}.toString())\n`;
        if (i < pathParams.length - 1) {
            result += `${indent}append('/')\n`;
        }
    }
    if (queryParams.length > 0) {
        result += `${indent}append('?')\n`;
    }
    for (let i = 0; i < queryParams.length; i++) {
        const arg = queryParams[i];

        let currIndent = indent;
        if (isArrayParam(arg)) {
            currIndent = indent + indent;
            result += `${indent}${arg.name}.forEachIndexed { idx, argv -> `;
        } else if (!arg.required) {
            currIndent = indent + indent;
            result += `${indent}if (${arg.name} != null) {`;
        }
        result += `
${currIndent}append(${argConstName(data, arg)})
${currIndent}append('=')
${currIndent}append(argv.toString())
`;
        if (isArrayParam(arg)) {
            result += `${currIndent}if (idx < ${arg.name}.lastIndex) append('&')\n`;
        }
        if (isArrayParam(arg) || !arg.required) {
            result += `${indent}}\n`;
        }

        if (i < queryParams.length - 1) {
            result += `${indent}append('&')\n`;
        }
    }

    return (
        result +
        `
${indent}if (endsWith('&')) deleteCharAt(lastIndex)
${indent}if (endsWith('?')) deleteCharAt(lastIndex)  
}.toString()`
    );
}

export function generateArgsCode(data: InputData): string {
    const pathConstName = constantCase(data.name + "Path");
    const pathConstCode = `
/** The base path for the ${data.name}. */
public const val ${pathConstName} = "${data.path}";  
`;

    const argConstsCode =
        "\n" +
        data.args
            .map((arg) => {
                return `/** The name of the ${arg.name} argument of type [${arg.class}] */
public const val ${argConstName(data, arg)} = "${arg.name}"`;
            })
            .join("\n") +
        "\n";

    const route = generateRoute(pathConstName, data);
    const routeConstName = constantCase(data.name + "Route");
    const routeConstCode = `
/** The complex route pattern for the ${data.name}. */
public const val ${routeConstName} = "${route}"
`;

    const navGraphBuilderArgumentsCode = data.args
        .map((arg) => {
            const indent = " ".repeat(4 * 3);
            const navType = resolveNavType(arg);
            return (
                indent +
                `navArgument(${argConstName(data, arg)}) {
${indent}    type = ${navType}  
${indent}    nullable = ${arg.required ? false : navType === "NavType.StringType"}      
${indent}},`
            );
        })
        .join("\n");

    const navGraphBuilderCode = `
/**
 * Sets up the ${data.name} destination.
 * @see androidx.navigation.NavGraphBuilder.composable
 */
public fun NavGraphBuilder.${camelCase(data.name)}() {
    composable(
        route = ${routeConstName},
        arguments = listOf(
${navGraphBuilderArgumentsCode}
        )
    ) {
        Text("${data.name}") // FIXME: implement
    }
}    
`;
    // TODO: support arg classes?
    const navExtParameterCode = data.args
        .map((arg) => {
            const indent = "    ";
            let afterClass = "";
            const lcClass = arg.class.toLowerCase();
            if (isNullableAsParam(arg)) {
                afterClass = "? = null";
            } else if (lcClass.startsWith("list<") && !arg.required) {
                afterClass = " = emptyList()";
            } else if (arg.asArray && !arg.required) {
                if (lcClass.startsWith("long")) {
                    afterClass = " = longArrayOf()";
                } else if (lcClass.startsWith("float")) {
                    afterClass = " = floatArrayOf()";
                } else if (lcClass.startsWith("int")) {
                    afterClass = " = intArrayOf()";
                } else if (lcClass.startsWith("boolean")) {
                    afterClass = " = booleanArrayOf()";
                } else {
                    afterClass = " = emptyArray()";
                }
            }
            return `${indent + arg.name}: ${arg.class}${afterClass},`;
        })
        .join("\n");

    const navExtArgsPassCode = data.args.map((arg) => arg.name).join(", ");

    const navControllerCode = `
${generateStringBuilderCode(navExtParameterCode, pathConstName, data)}
    
/** 
 * Navigates to the ${data.name}.
 * @throws IllegalArgumentException if the given route is invalid
 */
public fun NavController.navigateTo${data.name}(
${navExtParameterCode}    
    options: NavOptions? = null,
) = navigate(buildRoute(${navExtArgsPassCode}), options)

/** 
 * Navigates to the ${data.name}.
 * @throws IllegalArgumentException if the given route is invalid
 */
public fun NavController.navigateTo${data.name}(
${navExtParameterCode}
    builder: NavOptionsBuilder.() -> Unit,
) = navigate(buildRoute(${navExtArgsPassCode}), builder)

/** 
 * Tries navigating to the ${data.name}, 
 * catching any [IllegalArgumentException] in the process.
 * @returns \`true\`, if and only if navigation succeeded
 */
public fun NavController.tryNavigateTo${data.name}(
${navExtParameterCode}
    options: NavOptions? = null,
): Boolean {
    try {
        navigateTo${data.name}(${navExtArgsPassCode}, options)
        return true
    } catch (e: IllegalArgumentException) {
        return false
    }
}

/** 
 * Tries navigating to the ${data.name}, 
 * catching any [IllegalArgumentException] in the process.
 * @returns \`true\`, if and only if navigation succeeded
 */
public fun NavController.tryNavigateTo${data.name}(
${navExtParameterCode}
    builder: NavOptionsBuilder.() -> Unit
): Boolean {
    try {
        navigateTo${data.name}(${navExtArgsPassCode}, builder)
        return true
    } catch (e: IllegalArgumentException) {
        return false
    }
}
`;
    const additionalImports = `import androidx.navigation.NavType
import androidx.navigation.navArgument
`;
    return (
        imports +
        additionalImports +
        getAttribution() +
        pathConstCode +
        argConstsCode +
        routeConstCode +
        navGraphBuilderCode +
        navControllerCode
    );
}
