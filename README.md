## Matrix Firebase module

A model for Matrix Apps interacting via Firebase.

Firebase stores the following:

1) User and device associations
2) Device and app associations
3) App configurations

Firebase is also responsible for notifying connecting services on app configuration changes, either from the CLI, a Deployment or the Dashboard.

## Methods

`user`
- `add(userId)` - don't use this, included for completeness
- `get(userId)` - returns device objects
- `remove(userId)` - removes user completely, DANGER

`device`
- `add(userId, deviceId)` - associates device with user
- `get(userId, deviceId)` - retrieves apps for device
- `remove(userId,deviceId)` 0 - remove device and all apps

`app`
- `add(userId, deviceId, appId, config)` - associates app + config with device
- `update(userId, deviceId, appId, config)` - update a deep config variable without overwriting the whole thing
- `get(userId, deviceId, appId)` - get config for an app
- `onInstall(userId, deviceId, cb)` - watch a device for app installs
- `onChange(userId, deviceId, appId, cb)` - watch an app for config changes


### Schema

```
userId / deviceId / appId / config
```

### Test Output
```

  matrix firebase module
    ✓ can connect to firebase (45ms)
    ✓ can add an app configuration
    lookups
      ✓ can get devices for a user (504ms)
      ✓ can get apps for a device
      ✓ can get an config for an app
    events
      ✓ supports onInstall to watch for app installs
      ✓ supports onChange to watch for app config changes

```
