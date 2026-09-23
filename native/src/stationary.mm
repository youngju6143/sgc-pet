// NSWindow 의 collectionBehavior 에 Stationary 를 켠다.
// Mission Control(F3)·Exposé 가 이 창을 "안 건드리는" 창으로 취급하게 만든다.
// Dock 이 쓰는 것과 같은 속성이고, Electron 은 이걸 열어주지 않는다.
#import <Cocoa/Cocoa.h>
#include <node_api.h>

static napi_value SetStationary(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  if (argc < 1) return NULL;

  void* data = NULL;
  size_t len = 0;
  if (napi_get_buffer_info(env, args[0], &data, &len) != napi_ok || len < sizeof(void*)) return NULL;

  bool on = true;
  if (argc >= 2) napi_get_value_bool(env, args[1], &on);

  // macOS 에서 getNativeWindowHandle() 은 NSView* 를 담고 있다
  void* handle = *reinterpret_cast<void**>(data);
  NSView* view = (__bridge NSView*)handle;
  NSWindow* window = [view window];
  if (!window) return NULL;

  NSWindowCollectionBehavior behavior = [window collectionBehavior];
  if (on) {
    // Managed / Transient / Stationary 는 **서로 배타적**이다. 기존 Managed 를
    // 안 끄고 Stationary 만 OR 하면 macOS 가 통째로 무시한다.
    behavior &= ~(NSWindowCollectionBehaviorManaged | NSWindowCollectionBehaviorTransient);
    behavior |= NSWindowCollectionBehaviorStationary |
                NSWindowCollectionBehaviorCanJoinAllSpaces |
                NSWindowCollectionBehaviorFullScreenAuxiliary |
                NSWindowCollectionBehaviorIgnoresCycle;
  } else {
    behavior &= ~NSWindowCollectionBehaviorStationary;
    behavior |= NSWindowCollectionBehaviorManaged;
  }
  [window setCollectionBehavior:behavior];

  napi_value result;
  napi_get_boolean(env, true, &result);
  return result;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_value fn;
  napi_create_function(env, NULL, 0, SetStationary, NULL, &fn);
  napi_set_named_property(env, exports, "setStationary", fn);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
