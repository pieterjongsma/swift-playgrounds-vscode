// swift-tools-version:4.2
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "Playground",
    dependencies: [
        .package(url: "https://github.com/Alamofire/Alamofire.git", from: "4.0.0")
    ],
    targets: [
        .target(
            name: "Playground",
            dependencies: ["Alamofire"],
            path: "Sources"),
    ]
)
