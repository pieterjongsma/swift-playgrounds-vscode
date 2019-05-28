//: Playground - noun: a place where people can play

/*:
 # A playground to learn regular expressions with Swift
 
 This playground follows the documentation on this repository: https://github.com/zeeshanu/learn-regex
 See also this cheat sheet: https://www.cheatography.com/davechild/cheat-sheets/regular-expressions/pdf_bw/
 Enter the string that you want to use a regular expression on: https://txt2re.com/
 Online RegEx tester: https://regex101.com/
 
 © 2017 Ogulcan Orhan - [Github](https://github.com/ogulcan)
 */

//: ## Setup
//: Import Foundation if you want to use to String and etc.
import Foundation

/*:
 ## Let's start with small example
 
 Just want to see how regular expression works with Swift
 */
let simplePattern = "run"
let simpleInput = "run forest run"

let regularExpression: NSRegularExpression = try NSRegularExpression(pattern: simplePattern, options: .caseInsensitive)
let matches = regularExpression.matches(in: simpleInput, options: [], range: NSMakeRange(0, simpleInput.utf16.count))

matches.count // --> Should be 2


/*:
 ## Wrapper
 
 Swift stuff to handle those crowd
 */
protocol RegexProtocol {
    var input: String? { get }
    var pattern: String? { get }
    var options: NSRegularExpression.Options { get }
    var matchingOptions: NSRegularExpression.MatchingOptions { get }
}

public class Regex: RegexProtocol {
    
    typealias regexBuild = (Regex) -> Void
    
    var input: String?
    var pattern: String?
    var results: [String]?
    var options: NSRegularExpression.Options = .anchorsMatchLines
    var matchingOptions: NSRegularExpression.MatchingOptions = []
    
    private var regularExpression: NSRegularExpression?
    private var checkingResult: [NSTextCheckingResult]?

    init(_ build: regexBuild) throws {
        build(self)
        self.regularExpression = try NSRegularExpression(pattern: pattern!, options: options)
    }
    
    func matches() -> Bool {
        guard input != nil else {
            print("Input should provided with builder")
            return false
        }
        
        return self.matches(self.input!)
    }
    
    func matches(_ input: String) -> Bool {
        self.checkingResult = regularExpression?.matches(in: self.input!,
                                                         options: matchingOptions,
                                                         range: self.getRange(of: input))
        
        if (self.checkingResult!.count > 0) {
            self.setResult()
            return true
        } else {
            return false
        }
    }
    
    func match() -> (Bool, Int) {
        guard input != nil else {
            print("Input should provided with builder")
            return (false, 0)
        }

        return (self.matches(self.input!), self.checkingResult!.count)
    }
    
    func match(_ input: String) -> (Bool, Int) {
        return (self.matches(input), self.checkingResult!.count)
    }
    
    private func getRange(of text: String) -> NSRange {
        return NSMakeRange(0, text.count) // Swift 4 will let call just count
    }
    
    private func setResult() {
        self.results = self.checkingResult!.map {
           return String(self.input![Range($0.range, in: self.input!)!])
        }
    }
}

//: ## Example
var regEx = try Regex({
    $0.pattern = "run"
    $0.input = "run forest run"
})

regEx.matches() // --> Should be true
regEx.match().1 // --> Should be 2

regEx = try Regex({
    $0.pattern = "run"
    $0.input = "Run forest run"
})

regEx.matches() // --> Should be true
regEx.match().1 // --> Should be 1 (Because pattern is case sensitive as declared above by options)


/*:
 ## Meta Characters
 
 Note: All descriptions are from learn-regex repository that created by Zeeshan Ahmed
 https://github.com/zeeshanu/learn-regex
 */

//: . (period character): "Period matches any single character except a line break."

//: Example
regEx = try Regex({
    $0.pattern = ".ies"
    $0.input = "All cities are filled with puppies"
})

regEx.match().0 // --> Should be true
regEx.match().1 // --> Should be 2
//: Matches: "ties,pies"

//: Example
regEx = try Regex({
    $0.pattern = "ies."
    $0.input = "All cities are filled with puppies"
})

regEx.match().0 // --> Should be true
regEx.match().1 // --> Should be 1 (Because . 'puppies' is not matched with any character that follows by 'ies')
//: Matches: "ies "

//: [] (character set): "Matches any character contained between the square brackets."

//: Example
regEx = try Regex({
    $0.pattern = "[Rr]un"
    $0.input = "Run forest run"
})

regEx.match().0 // --> Should be true
regEx.match().1 // --> Should be 2 (Now it matches with both cases)
//: Matches: "Run,run"

//: Example
regEx = try Regex({
    $0.pattern = "ies[.]"
    $0.input = "All cities are filled with puppies."
})

regEx.match().0 // --> Should be true
regEx.match().1 // --> Should be 1 (Because period character is inside bracket)
//: Match: "ies."

//: [^] (negated character set): "Matches any character that is not contained between the square brackets"

//: Example
regEx = try Regex({
    $0.pattern = "[^t]ies"
    $0.input = "All cities are filled with puppies."
})

regEx.match() // --> Should be true & 1
//: Match: "pies"

//: + (repetitions character, one or more): "The symbol + matches one or more repetitions of the preceding character"

//: Example
regEx = try Regex({
    $0.pattern = "c.+t"
    $0.input = "The fat cat sat on the mat."
})

regEx.match() // --> Should be true & 1 (It's just one match cause it also matches with whitespaces, too)
//: Match: "cat sat on the mat"

//: * (repetitions character, zero or more): "The symbol * matches zero or more repetitions of the preceding matcher"

//: Example
regEx = try Regex({
    $0.pattern = "\\s*[a-z]\\s*"
    $0.input = "Run forest run."
})

regEx.match() // --> Should be true & 11 (Matches only with every lowercase letter)
//: Matches: "u,n ,f,o,r,e,s,t ,r,u,n" --> Do not miss whitespaces

//: ? (repetitions character): "Meta character ? makes the preceding character optional"

//: Example
regEx = try Regex({
    $0.pattern = "[R]un"
    $0.input = "Run forest run"
})

regEx.match() // --> Should be true & 1
//: Matches: "Run"

//: Example
regEx = try Regex({
    $0.pattern = "[R]?un"
    $0.input = "Run forest run"
})

regEx.match() // --> Should be true & 2
// Matches: "Run,un"


/*:
 ## Braces aka Quantifiers
 
 Note: All descriptions are from learn-regex repository that created by Zeeshan Ahmed
 https://github.com/zeeshanu/learn-regex
 */


//: {} (bracets): "Used to specify the number of times that a character or a group of characters can be repeated."

//: Example
regEx = try Regex({
    $0.pattern = "[a-z]{4,}"
    $0.input = "Run forest run"
})

regEx.match() // --> Should be true & 1
// Matches: "forest"

//: Example
regEx = try Regex({
    $0.pattern = "[a-z]{1,3}"
    $0.input = "Run forest run"
})

regEx.match() // --> Should be true & 4
// Matches: "un,for,est,run"

//: Example
regEx = try Regex({
    $0.pattern = "[a-z]{3}"
    $0.input = "Run forest run"
})

regEx.match() // --> Should be true & 3
// Matches: "for,est,run"

//: | (Alternations - Sub-patterns): "Used to define alternation. Alternation is like a condition between multiple expressions"

//: Example
regEx = try Regex({
    $0.pattern = "(f|c|s|m).t"
    $0.input = "The fat cat sat on the mat."
})

regEx.match() // --> Should be true & 4
//: Match: "fat,cat,sat,mat"

//: Example
regEx = try Regex({
    $0.pattern = "(f|c|s|m).*t"
    $0.input = "The fat cat sat on the mat."
})

regEx.match() // --> Should be true & 1
//: Match: "fat cat sat on the mat"

//: Example
regEx = try Regex({
    $0.pattern = "(R|r)un"
    $0.input = "Run forest run."
})

regEx.match() // --> Should be true & 2
//: Match: "Run,run"

//: Example
regEx = try Regex({
    $0.pattern = "(T|t)he|car"
    $0.input = "The car is parked in the garage."
})

regEx.match() // --> Should be true & 3
//: Match: "The,car,the"

//: ^ (Caret): "used to check if matching character is the first character of the input string"

//: Example
regEx = try Regex({
    $0.pattern = "^(T|t)he"
    $0.input = "The car is parked in the garage."
})

regEx.match() // --> Should be true & 1
//: Match: "The"

//: $ (Dollar): "Used to check if matching character is the last character of the input string."

//: Example
regEx = try Regex({
    $0.pattern = "(f|c|s|m)(at)$"
    $0.input = "The fat cat sat on the mat"
})

regEx.match() // --> Should be true & 1
//: Match: "mat."


/*:
 ## Shorthand Character Sets
 
 Note: All descriptions are from learn-regex repository that created by Zeeshan Ahmed
 https://github.com/zeeshanu/learn-regex
 */


//: \w - Matches alphanumeric characters: [a-zA-Z0-9_]
//: \W - Matches non-alphanumeric characters: [^\w]
//: \d - Matches digit: [0-9]
//: \D - Matches non-digit: [^\d]
//: \s - Matches whitespace character: [\t\n\f\r\p{Z}]
//: \S - Matches non-whitespace character: [^\s]


/*:
 ## Flags
 
 Note: All descriptions are from learn-regex repository that created by Zeeshan Ahmed
 https://github.com/zeeshanu/learn-regex
 */


//: i (Case Sensitive): "Used to perform case-insensitive matching"

//: Example
regEx = try Regex({
    $0.pattern = "The"
    $0.input = "The fat cat sat on the mat."
    $0.options = .caseInsensitive
})

regEx.match() // --> Should be true & 2
//: Match: "The,the"

//: m (Multiline): "Anchor meta character works on each line."

//: Example
regEx = try Regex({
    $0.pattern = "The"
    $0.input = "The fat cat sat on the mat."
    $0.options = [.caseInsensitive, .anchorsMatchLines]
})

//: g (Global Search): "Search for a pattern throughout the input string"
//: Note: It is global by default


/*:
 ### Examples
 
 Let's find out some common problems
 */

//: #### Matching html (only) tags (prevent close tags)

regEx = try Regex({
    $0.pattern = "<(-\\/)?\\w+>"
    $0.input = "Hello this is <strong>John</strong> from <i>Londong, England</i>. Here is my e-mail address: <p>john@github.com</p>."
})

regEx.match() // --> Should be true & 3
regEx.results // --> Match: "<strong>,</strong>,<i>"

//: #### Match html values (not tags)

regEx = try Regex({
    $0.pattern = "<a.*?>(\\w+)</a>"
    $0.input = """
    Hello this is <strong>John</strong> <a>from</a> <i>Londong, England</i>. Here is my e-mail address: <p>john@docket.com</p>. Here is a link: <a href="http://example.com">Contact</a>
    """
})

regEx.match() // --> Should be true & 3
regEx.results // --> Match: "<strong>,</strong>,<i>"

//: #### Matching decimal numbers

regEx = try Regex({
    $0.pattern = "^-?\\d+(,\\d+)*(\\.\\d+(e\\d+)?)?$"
    $0.input = """
    3.14529
    -255.34
    128
    1.9e10
    123,340.00
    720p
    """ // Skip 720p
})

regEx.match() // --> Should be true & 5
regEx.results // --> Match: "3.14529 -255.34 128 1.9e10 123,340.00"

//: #### Matching emails (only names)

regEx = try Regex({
    $0.pattern = "^([\\w\\.]*)"
    $0.input = """
    tom@hogwarts.com tom.riddle@hogwarts.com
    tom.riddle+regexone@hogwarts.com
    tom@hogwarts.eu.com
    potter@hogwarts.com
    harry@hogwarts.com
    hermione+regexone@hogwarts.com
    """
})

regEx.match() // --> Should be true & 6
regEx.results // --> Match: "tom", "tom.riddle", "tom", "potter", "harry", "hermione"
