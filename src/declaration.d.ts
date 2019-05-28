declare module '*.module.css' {
    interface IClassNames {
        [className: string]: string
    }
    const classNames: IClassNames;
    export default classNames;
}

// declare module '*.module.css' {
//     interface IClassNames {
//         [className: string]: string
//     }
//     const classNames: IClassNames;
//     export = classNames;
// }

declare module "*.swift" {
    const value: any;
    export = value;
}

declare module 'ndjson';
