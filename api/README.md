# API Docs

# NEO4J DATABASE DOCS

This database works by applying labels to nodes, each of which may carry constraints. For example, a "Text" label may require that the node has a "title" property that is not null.

Node labels will also exist in a hierarchy, so that a node with one label may also be required to have another label, e.g. a "Book" node may also be required to be a "Text".

## Label Hierarchy.

Labels exist in a hierarchy. A node with a given label must also have all parent labels applied to it.

Entity
 - Text
 	- Source
 	- Edition
 		- Book
 		- Article
 - Artifact
 	- Painting
 	- Sculpture
 	- Monument
 		- Building
 - Person
 	- Author
 		- Poet
 	- Translator
 - User

 ## Label Requirements.

For the following list of labels, each node with a given label must also abide by the listed constraint(s):

|Label|Constraint|
|--|--|
|Person|'name' not null|
|Text|'title' not null|