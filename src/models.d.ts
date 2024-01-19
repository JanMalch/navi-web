export interface Argument {
    name: string;
    class: string;
    asArray: boolean;
    required: boolean;
}

export interface InputData {
    name: string;
    path: string;
    args: Argument[];
}
