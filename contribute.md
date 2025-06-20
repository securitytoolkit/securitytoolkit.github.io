---
layout: page
title: Contribute
---

## Structure

Each Red Team Command/code is defined in a file in the [`_wadcoms/`] folder named as `<tool name>.md`, such file consists only of a [YAML] front matter which describes the command and its attributes.

The full syntax is the following:

```
---
description: |
  Description what the command does and is usefull for.

  Command Reference:

  	Domain: arttoolkit.hacker.com

  	Port: 9001

  	IP address: 10.10.21.14
    
command: |
  put command here

code: |
  extra code can be placed here. This part is optional and can be removed if not nessasary. 

items:
  - Shell
services:
  - SERVICE
OS:
  - OS
attack_types:
  - ATTACK_TYPE
references:
  - LINK
  - LINK
---
```

Where `ITEM` is one of the values described in the [`_data/items.yml`] file, `SERVICE` is one of the values described in the [`_data/services.yml`] file, `OS` is one of the values described in the [`_data/OS.yml`] file, `ATTACK_TYPE` is one of the values described in the [`_data/attack_types.yml`] file, and `LINK` is a link to download the related tool for that command as well as links to any other relevant information about what the command is doing. 

Feel free to use any file in the [`_wadcoms/`] folder as an example.

## Pull request process

I accept commands that run on either Linux or Windows, just as long as they are useful for any kind of attacking scenario.

Before sending a pull request of a new command, ensure the following:

1. Verify the EXACT command works against at least one version of Windows.
2. Any parts of the command that need context should go in the 'Command References', such as username, password, target IP, domain, etc. For consistency, if your command uses a username, password, domain, and/or target IP, use `john`, `password123`, `test.local` and `10.10.10.1` respectively.
3. Include the proper filters related to your command. This currently means including any and all remote services required to be running on the target machine in order for the command to work, the Operating System the command can be run from, and the type of attack. For example, Impacket's smbclient.py requires the SMB service to be running on the remote Windows machine, so SMB would be one of the services included. And since it can by run from any OS, Linux and Windows would be the OS that's included. Finally, the attack type is Exploitation because you are getting a remote shell.
4. Add a minimum, a link to download the related tool MUST be provided and added under `references`.

Pull requests adding new items in [`_data/items.yml`], services in [`_data/services.yml`], OS in [`_data/OS.yml`], or attack types in [`_data/attack_types.yml`] are allowed and subjected to project maintainers vetting.

[YAML]: http://yaml.org/
[`_wadcoms/`]: https://github.com/securitytoolkit/securitytoolkit.github.io/tree/master/_wadcoms
[`_data/services.yml`]: https://github.com/securitytoolkit/securitytoolkit.github.io/blob/master/_data/services.yml
[`_data/items.yml`]: https://github.com/securitytoolkit/securitytoolkit.github.io/blob/master/_data/items.yml
[`_data/OS.yml`]: https://github.com/securitytoolkit/securitytoolkit.github.io/blob/master/_data/OS.yml
[`_data/attack_types.yml`]: https://github.com/securitytoolkit/securitytoolkit.github.io/blob/master/_data/attack_types.yml
