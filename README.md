# CORAS The Explorer

A web application presenting the CORAS approach and language, to aid in learning the framework.

## Vision

To make a comprehensive web application that can serve users of the CORAS approach of all levels from beginner to advanced, by providing up-to-date introduction and tutorials, and documentation of the language. The application should also include an interactive CORAS editing tool to allow users to test and work with the language in the browser.

In addition to being a great tool for users, the application code should be easily understandable and maintainable.

## Next step

Create a prototype with a short, basic introduction to the language concepts, and possibly a first prototype of an editing tool.


[logo]: ./assets/CORASTheExplorer.png


## Missing functionality

Edge does not display unboxedElement for some reason
Not every action in editor goes through a redux action. Creating and modifying links leave no trace. Unsure if this is intended or optimal.
List of actions circumventing redux
    Adding, modifying and removing links. Adding labels however is logged.
    Moving the paper and moving the elements on it.
    Right clicking on element treated as double click. probably intended.

## Potential changes
    Only update redux state on label save, not label change.

    Rely less on local component state. More specifically refer to the seperate papers directly through redux.
    Create a new menu at the side, with tabs connected to seperate papers. Will only display relevant icons per diagram type and switch upon tab selection.
    Might bind additional state values to the graph, i.e tabNo

## TODO
    Add all relevant diagrams as options.
    Make the diagram button look like a tab or similar.


## BUGS
    Paper coordinates not tied to graphs, move one graph and all are moved. [MINOR]
    Switching between diagrams creates new graph object. CID is changes, could cause clutter? [MINOR]
        
