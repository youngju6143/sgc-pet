{
  "targets": [
    {
      "target_name": "stationary",
      "sources": ["src/stationary.mm"],
      "conditions": [
        ["OS=='mac'", {
          "xcode_settings": {
            "CLANG_ENABLE_OBJC_ARC": "YES",
            "MACOSX_DEPLOYMENT_TARGET": "11.0"
          },
          "link_settings": { "libraries": ["-framework Cocoa"] }
        }]
      ]
    }
  ]
}
