# :space_invader: Required software you will need to install

Before getting started working on a **🫠 Smile** project you will need to install a few items on your local computer.

## 1. Install the latest Node.js

You will need to install Node.js on your computer if you haven't already.  You can download the latest version [here](https://nodejs.org/en/download/).  After the install completes, verify that you have the `npm` command in your terminal program of choice.

## 2. Create a GitHub account if you haven't and install the command-line tool

You will also need a [GitHub account](https://github.com/join) (free level is fine).  Tell Todd your username so he can add
you as a member of the [NYUCCL organization](https://github.com/nyuccl).  

Next make sure you have the GitHub Command Line Interface (cli) tool installed:
[download it here](https://cli.github.com) using the installer or homebrew.  

Next, allow the cli access to your GitHub account by typing:

```
gh auth login --web
```

into your terminal program.  This will open your default browser and ask you to log in to GitHub.


## 3. Request access to the shared database resources

Later you will want to customize the configuration of your application, but if you are in the gureckislab you will want to simply decrypt the pre-configured files provided in the repository.

::: info Great news!
You only need to do this the first time you try out **🫠 Smile**!  Then you will forever be part of the 
familia.
:::


To do this first install the git secret package which includes the relevant dependencies using homebrew: 

```
brew install git-secret
```

Next create a RSA key-pair for your email address:

```
gpg --gen-key
```

There will be a sequence of questions you answer.  Use your preferred email address e.g., the one linked to GitHub.  Send Todd your public key by sending the output of this command to him on slack or via email (replace example@gmail.com with the address you provided to `gpg`):

<div class="language-"><pre><code><span class="line"><span style="color:#A6ACCD">gpg --armor --export example@gmail.com</span></span></code></pre></div>

Wait for him to reply and to make a push to the main **🫠 Smile** repo giving access to the encrypted files to your email address.

## 4. Install VSCode and Volar (optional)

It is highly recommended that you use [VS Code](https://code.visualstudio.com/) and the [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension as your text editor/development environment.

## 5. Install Vue Devtools (optional)

Optionally install the [Vue Devtools](https://devtools.vuejs.org) in your browser (e.g., Chrome).  This can help in debugging your experiment.





