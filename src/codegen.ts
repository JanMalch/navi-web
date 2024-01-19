import "prismjs";
import "prismjs/components/prism-kotlin";
import { generateArgsCode } from "./codegen/args.ts";
import { generateNoArgsCode } from "./codegen/no-args.ts";
import { InputData } from "./models";
import "./prism-android-studio.css";

export function generateCode(data: InputData): string {
    return data.args.length > 0
        ? generateArgsCode(data)
        : generateNoArgsCode(data);
}
