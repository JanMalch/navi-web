import { camelCase, constantCase } from "change-case";
import { InputData } from "../models";
import { getAttribution, imports } from "./shared.ts";

export function generateNoArgsCode(data: InputData): string {
    const pathConstName = constantCase(data.name + "Path");
    const pathConstCode = `
/** The base path for the ${data.name}. */
public const val ${pathConstName} = "${data.path}";  
`;

    const navGraphBuilderCode = `
/**
 * Sets up the ${data.name} destination.
 * @see androidx.navigation.NavGraphBuilder.composable
 */
public fun NavGraphBuilder.${camelCase(data.name)}() {
    composable(route = ${pathConstName}) {
        Text("${data.name}") // FIXME: implement
    }
}    
`;
    const navControllerCode = `
/** 
 * Navigates to the ${data.name}.
 * @throws IllegalArgumentException if the given route is invalid
 */
public fun NavController.navigateTo${data.name}(
    options: NavOptions? = null,
) = navigate(${pathConstName}, options)

/** 
 * Navigates to the ${data.name}.
 * @throws IllegalArgumentException if the given route is invalid
 */
public fun NavController.navigateTo${data.name}(
    builder: NavOptionsBuilder.() -> Unit,
) = navigate(${pathConstName}, builder)

/** 
 * Tries navigating to the ${data.name}, 
 * catching any [IllegalArgumentException] in the process.
 * @returns \`true\`, if and only if navigation succeeded
 */
public fun NavController.tryNavigateTo${data.name}(
    options: NavOptions? = null,
): Boolean {
    try {
        navigateTo${data.name}(options)
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
    builder: NavOptionsBuilder.() -> Unit
): Boolean {
    try {
        navigateTo${data.name}(builder)
        return true
    } catch (e: IllegalArgumentException) {
        return false
    }
}
`;

    return (
        imports +
        getAttribution() +
        pathConstCode +
        navGraphBuilderCode +
        navControllerCode
    );
}
