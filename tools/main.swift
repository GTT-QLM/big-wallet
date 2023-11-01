// Copyright © 2023 Tokenary. All rights reserved.

import Foundation

let semaphore = DispatchSemaphore(value: 0)

let projectDir = FileManager.default.currentDirectoryPath
let base = "\(projectDir)/tools/generated/"

let bundledNetworksFileURL = URL(fileURLWithPath: base + "bundled-networks.json")
let nodesFileURL = URL(fileURLWithPath: base + "nodes-to-bundle.json")
let bundledNodesFileURL = URL(fileURLWithPath: base + "BundledNodes.swift")

let https = "https://"

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .withoutEscapingSlashes, .sortedKeys]

func fetchChains(completion: @escaping ([EIP155ChainData]) -> Void) {
    URLSession.shared.dataTask(with: URL(string: "https://chainid.network/chains.json")!) { (data, _, _) in
        completion(try! JSONDecoder().decode([EIP155ChainData].self, from: data!))
    }.resume()
}

func updateNodesFile(networks: [EthereumNetwork]) {
    var dict = [String: String]()
    for n in networks {
        dict[String(n.chainId)] = n.nodeURLString
    }
    
    let dictData = try! JSONSerialization.data(withJSONObject: dict, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
    try! dictData.write(to: nodesFileURL)
    
    
    let dictString = networks.map { "\($0.chainId): \"\($0.nodeURLString.dropFirst(https.count))\"" }.joined(separator: ",\n        ")
    let contents = """
    import Foundation

    struct BundledNodes {
        
        static let dict: [Int: String] = [
            \(dictString)
        ]
        
    }

    """
    
    try! contents.data(using: .utf8)?.write(to: bundledNodesFileURL)
}

fetchChains { chains in
    let currentData = try! Data(contentsOf: bundledNetworksFileURL)
    let currentNetworks = try! JSONDecoder().decode([EthereumNetwork].self, from: currentData)
    let ids = Set(currentNetworks.map { $0.chainId })
    
    // TODO: make sure https
    
    let filtered = chains.filter { ids.contains($0.chainId) }
    var result = filtered.map {
        EthereumNetwork(chainId: $0.chainId,
                        name: $0.name,
                        symbol: $0.nativeCurrency.symbol,
                        nodeURLString: $0.rpc.first ?? "")
    }
    
    result = currentNetworks
    
    let data = (try! encoder.encode(result)) + "\n".data(using: .utf8)!
    try! data.write(to: bundledNetworksFileURL)
    updateNodesFile(networks: result)
    
    semaphore.signal()
}

semaphore.wait()
print("🟢 all done")
