# Unicity Commons

A library of common functions to be used in Unicity projects.

## Browser Compatibility

When bundling for the browser, the `NodeDataHasher` implementation is
automatically replaced by `SubtleCryptoDataHasher` through the `browser`
field in `package.json`. This allows the hashing utilities to work in
modern browsers such as Chrome without including Node specific code.
