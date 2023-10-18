// Copyright © 2021 Tokenary. All rights reserved.

import Foundation

struct Defaults {
 
    private static let userDefaults = UserDefaults.standard

    static var latestReviewRequestDate: Date? {
        get {
            return userDefaults.value(forKey: "latestReviewRequestDate") as? Date
        }
        set {
            userDefaults.set(newValue, forKey: "latestReviewRequestDate")
        }
    }
    
    static var shouldPromptSafariForLegacyUsers: Bool {
        get {
            return userDefaults.bool(forKey: "shouldPromptSafariForLegacyUsers")
        }
        set {
            userDefaults.set(newValue, forKey: "shouldPromptSafariForLegacyUsers")
        }
    }
    
    static var didMigrateKeychainFromTokenaryV1: Bool {
        get {
            return userDefaults.bool(forKey: "didMigrateKeychainFromTokenaryV1")
        }
        set {
            userDefaults.set(newValue, forKey: "didMigrateKeychainFromTokenaryV1")
        }
    }
    
    static var reviewRequestsGoodMomentsCount: Int {
        get {
            return userDefaults.integer(forKey: "reviewRequestsGoodMomentsCount")
        }
        set {
            userDefaults.set(newValue, forKey: "reviewRequestsGoodMomentsCount")
        }
    }
    
}
