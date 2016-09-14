## Matrix Firebase module

A model for Matrix Apps interacting via Firebase.

Firebase stores the following:

1) User and device associations
2) Device and app associations
3) App configurations

Firebase is also responsible for notifying connecting services on app configuration changes, either from the CLI, a Deployment or the Dashboard.


###### Bugs
https://github.com/matrix-io/matrix-firebase/issues

###### Questions
http://community.matrix.one


## Methods



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
