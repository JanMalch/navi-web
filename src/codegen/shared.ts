import { Argument } from "../models";

export const imports = `import androidx.compose.material3.Text
import androidx.navigation.NavController
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavOptions
import androidx.navigation.NavOptionsBuilder
import androidx.navigation.compose.composable
`;

export const getAttribution = () => `
/*
 * Originally generated on ${location.href}
 */
`;

export const isNullableAsParam = (arg: Argument) =>
    !arg.required && resolveNavType(arg) === "NavType.StringType";

export const isArrayParam = (arg: Argument) =>
    arg.asArray ||
    arg.class.toLowerCase().startsWith("list<") ||
    arg.class.toLowerCase().endsWith("array");

export const isForQueryParam = (arg: Argument) =>
    isArrayParam(arg) ||
    (!arg.required
        ? // only strings may be not required
          resolveNavType(arg) === "NavType.StringType"
        : false);

export function resolveNavType(arg: Argument): string {
    let base = "";
    let includeWarning = false;
    let forceArray = false;
    switch (arg.class.toLowerCase()) {
        case "long":
            base = "Long";
            break;
        case "float":
            base = "Float";
            break;
        case "int":
            base = "Int";
            break;
        case "boolean":
            base = "Bool";
            break;
        case "string":
        case "uuid":
        case "java.util.uuid":
            base = "String";
            break;
        case "intarray":
        case "list<int>":
            base = "Int";
            forceArray = true;
            break;
        case "booleanarray":
        case "list<boolean>":
            base = "Bool";
            forceArray = true;
            break;
        case "floatarray":
        case "list<float>":
            base = "Float";
            forceArray = true;
            break;
        case "longarray":
        case "list<long>":
            base = "Long";
            forceArray = true;
            break;
        default:
            includeWarning = true;
            base = "String";
    }

    return (
        "NavType." +
        base +
        (arg.asArray || forceArray ? "ArrayType" : "Type") +
        (includeWarning ? " // FIXME: verify NavType" : "")
    );
}
