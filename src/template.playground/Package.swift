// swift-tools-version:5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "Playground",
    dependencies: [],
    targets: [
        .executableTarget(
            name: "Playground",
            path: "Sources"),
    ]
)
