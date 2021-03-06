# @4th-motion/git-hooks
> Easy to set up git hooks that can be shared between your projects.

![Version][version-image]
![License][license-image]

Handle all your git hooks in one place and share them between your projects. Changes can be made at any time - old configurations are automatically overwritten because there's only one source of truth.

<br>

![Terminal][screenshot]

<br>

## Installation

Add this package as a devDependency to your project:

```
yarn add --dev @4th-motion/git-hooks
```

<br>

## Usage

Once the package is installed, you can initiate it with:

```
yarn 4th-git-hooks
```

Now you can specify the tasks to be performed on a particular hook. The tasks must be present in the `script` field in _package.json_.

```json
{
  "git": {
    "pre-commit": ["lint", "test"]
  }
}
```

_Note that the `commit-msg` hook is always executed. This ensures that commits can only be pushed with certain keywords (e.g. `feat`, `fix`, …) and never to the master branch. If you do not want to activate this hook, just remove it from the `hooks/` folder._

<br>

## Behind the scenes

The initialization process extends the _package.json_ file as follows:

```json
{
  "scripts": {
    "postinstall": "4th-git-hooks"
  }
}
```

This will copy all git-hooks from the `hooks/` directory during each installation. You can always edit existing hooks or add new hooks. A list off all git hooks can be found [here](https://git-scm.com/docs/githooks).

<br>

## Further documents
- [Changelog](/docs/changelog.md)
- [Contributing](/docs/contributing.md)
- [Pull request](/docs/pull_request.md)
- [Code of conduct](/docs/code_of_conduct.md)

<br>

## Related projects

@4th-motion/eslint-config | @4th-motion/stylelint-config
:-------------------------|:-------------------------
[![@4th-motion/eslint-config][eslint-image]][eslint-config] | [![@4th-motion/stylelint-config][stylelint-image]][stylelint-config]

<br>

## License

Copyright © 2020 by 4th motion GmbH. Released under the [MIT License][license].

[screenshot]: https://assets.4thmotion.com/github/git-hooks/screenshot.png
[version-image]: https://img.shields.io/github/package-json/v/4th-motion/git-hooks
[license-image]: https://img.shields.io/github/license/4th-motion/git-hooks
[stylelint-image]: https://avatars3.githubusercontent.com/u/10076935?s=200&v=4
[eslint-image]: https://avatars3.githubusercontent.com/u/6019716?s=200&v=4
[stylelint-config]: https://github.com/4th-motion/stylelint-config
[eslint-config]: https://github.com/4th-motion/eslint-config
[license]: /LICENSE.md
