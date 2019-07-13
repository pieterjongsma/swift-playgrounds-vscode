import Foundation

let bundle = Bundle.main
bundle.bundlePath
let imageURL = bundle.url(forResource: "image", withExtension: "jpg")
bundle.infoDictionary

var hello = "Hello world"

var a = 2
var b = 4
var c = a-b

var d = 1.0/2.3
var e = 5
var foobar = 10

for i in 0...100 {
    a = i
}

print(hello)
