//
// https://www.youtube.com/watch?v=3fJsqGHhlVA
//

import Foundation
import TensorFlow

struct MyModel: Layer {
    var conv = Conv2D<Float>(filterShape: (5, 5, 3, 6))
    var maxPool = MaxPool2D<Float>(poolSize: (2, 2), strides: (2, 2))
    var flatten = Flatten<Float>()
    var dense = Dense<Float>(inputSize: 16 * 5 * 5, outputSize: 10)
}

var model = MyModel()
let optimizer = SGD(for: model, learningRate: 0.2)

let x = Tensor<Float>(randomUniform: [1, 128])
let y = Tensor<Int32>(rangeFrom: 0, to: 10, stride: 1)
