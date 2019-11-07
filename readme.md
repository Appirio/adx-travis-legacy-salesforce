# AppirioDX Project [![pipeline status](https://gitlab.appirio.com/appirio-dx/generic/badges/master/pipeline.svg)](https://gitlab.appirio.com/appirio-dx/generic/commits/master)
A stripped down version with minimal setup to get started with AppirioDX.

1. Use ezbake to clone the **generic** repository:
    ```
    ezbake prepare -r https://gitlab.appirio.com/appirio-dx/generic -b ezbake
    ```

1. EZBake will prompt you for your project name, and your name and email. It will then prompt you for the repository you want to **create**. Create a new repository (in GitLab for example) and then paste that URL there.

1. Respond to any other prompts that EZBake provides

1. type ```adx --help``` to see a list of available commands at any point.

1. For example, for each new story or piece of work you can create and checkout a feature branch. You can also use this shortcut command (replace the story number as needed):
    ```
    adx git:branch --name S-520780
    ```
