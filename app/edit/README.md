# Edit Page Structure

The edit page allows an authenticated user to edit a node. All data associated with a node can be edited. Data presents itself as a JSON in teh following structure:

```ts
interface Node {
  id: string;
  nodeId: string;
  labels: string[];
  properties: {
    [key: string]: any;
  };
}
```

## Page Components

### The Properties Table

This component displays the node's arbitrary properties as a table which can be edited. All properties have keys which must be strings, and values which can be strings or primitives or arrays of strings or primitives.

The user is presented with a table with three rows: the key, the value, and the delete button. At the bottom of the list is an "Add New Property" button which will create a new row in the properties table. Typing in changes will automatically update the editedProperties state variable. When the entire Edit page is saved/submitted, these new editedProperties will be pushed to the database.

### The Labels Table

This component displays the node's list of labels as a column of text fields, each of which can be edited. All labels are plain strings. Each row in the column consists of a text input and a delete button to remove the label. Typing into the text field will automatically update the editedLabels state variable.