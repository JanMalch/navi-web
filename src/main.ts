import "./style.css";
import { generateCode } from "./codegen.ts";
import { Argument, InputData } from "./models";

function copyToClipboard(
    text: string,
    onSuccess: () => void,
    onError: () => void,
) {
    navigator.permissions
        .query({ name: "clipboard-write" as PermissionName })
        .then((result) => {
            if (result.state === "granted" || result.state === "prompt") {
                navigator.clipboard.writeText(text).then(
                    () => onSuccess(),
                    () => onError(),
                );
            } else {
                onError();
            }
        })
        .catch(() => onError());
}

if ("content" in document.createElement("template")) {
    const codeEl = document.querySelector<HTMLElement>("code")!;
    const formEl = document.querySelector<HTMLFormElement>("form")!;
    const addArgBtn =
        document.querySelector<HTMLButtonElement>("#add-argument-btn")!;
    const argumentsEl = document.querySelector<HTMLDivElement>("#arguments")!;
    const templateEl =
        document.querySelector<HTMLTemplateElement>("#argument-row")!;
    const copyBtn =
        document.querySelector<HTMLButtonElement>("#copy-to-clipboard")!;

    let prismHooked = false;
    const onFormValueChange = () => {
        if (!prismHooked && "highlight" in window.Prism) {
            window.Prism.hooks.add("before-highlight", function (env) {
                env.code = (env.element as HTMLElement).innerText;
            });
            prismHooked = true;
        }

        const raw = new FormData(formEl);
        const data = {
            name: "",
            path: "",
            args: [],
        } as InputData;
        for (const [key, value] of raw.entries()) {
            if (key === "path") {
                data.path = `${value}`.trim();
            } else if (key === "name") {
                data.name = `${value}`.trim();
            } else if (key.startsWith("args.")) {
                const [_, idxStr, prop] = key.split(".");
                const idx = Number.parseInt(idxStr, 10);
                if (data.args[idx] == null) {
                    data.args[idx] = {
                        name: "",
                        class: "",
                        asArray: false,
                        required: false,
                    };
                }
                if (prop === "name" || prop === "class") {
                    data.args[idx][prop] = value as string;
                } else if (prop === "asArray" || prop === "required") {
                    data.args[idx][prop] = value === "on";
                }
            }
        }
        data.args = data.args.filter(
            (x) => x != null && x.name.trim() && x.class.trim(),
        );
        location.hash = "#" + btoa(JSON.stringify(data));
        codeEl.innerText = generateCode(data);
        if ("highlight" in window.Prism) {
            window.Prism.highlightElement(codeEl);
        }
    };

    let idx = 0;
    const getNextIndex = () => idx++;

    const addArgumentEl = (arg?: Argument) => {
        const clone = templateEl.content.cloneNode(true) as DocumentFragment;
        const idx = getNextIndex();
        const nameEl = clone.querySelector<HTMLInputElement>(
            "input[data-name=name]",
        )!;
        const classEl = clone.querySelector<HTMLInputElement>(
            "input[data-name=class]",
        )!;
        const asArrayEl = clone.querySelector<HTMLInputElement>(
            "input[data-name=asArray]",
        )!;
        const requiredEl = clone.querySelector<HTMLInputElement>(
            "input[data-name=required]",
        )!;

        nameEl.setAttribute("name", `args.${idx}.name`);
        classEl.setAttribute("name", `args.${idx}.class`);
        asArrayEl.setAttribute("name", `args.${idx}.asArray`);
        requiredEl.setAttribute("name", `args.${idx}.required`);

        if (arg != null) {
            nameEl.value = arg.name;
            classEl.value = arg.class;
            asArrayEl.checked = arg.asArray;
            requiredEl.checked = arg.required;
        }

        const deleteBtn = clone.querySelector<HTMLButtonElement>(
            "button.delete-argument-btn",
        )!;
        deleteBtn.addEventListener("click", () => {
            deleteBtn.closest(".argument")!.remove();
            onFormValueChange();
        });
        argumentsEl.appendChild(clone);
    };

    const presetHash = location.hash;
    if (presetHash.startsWith("#")) {
        const encodedData = presetHash.substring(1);
        if (encodedData.length > 0) {
            const presetData = JSON.parse(atob(encodedData)) as InputData;
            const inputs = formEl.elements as HTMLFormControlsCollection &
                Record<string, HTMLInputElement>;
            inputs["name"].value = presetData.name || "";
            inputs["path"].value = presetData.path || "";

            for (const arg of presetData.args) {
                addArgumentEl(arg);
            }
        }
    }

    formEl.addEventListener("change", onFormValueChange);
    onFormValueChange();

    addArgBtn.addEventListener("click", () => {
        addArgumentEl();
    });

    copyBtn.addEventListener("click", () => {
        copyToClipboard(
            codeEl.innerText,
            () => {
                copyBtn.innerText = "Copied successful!";
                setTimeout(() => {
                    copyBtn.innerText = "Copy code";
                }, 3000);
            },
            () => {
                copyBtn.innerText = "Failed to copy!";
                setTimeout(() => {
                    copyBtn.innerText = "Copy code";
                }, 3000);
            },
        );
    });
}
