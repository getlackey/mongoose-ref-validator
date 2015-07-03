# Mongoose Ref Validator
Validates [model references](http://mongoosejs.com/docs/populate.html) by checking if the referenced id exists before any save. 

MongoDB **does not** enforce referential integrity. This module helps, but there are a couple of edge cases that are not covered yet. Also, data in the database can always be manipulated using other tools/clients causing inconsistency in the relationships.

## Options

### onDeleteRestrict
By default nothing is checked and no action is performed on delete. 

With this option we prevent the deletion of a referenced model when the current model is referencing one of its documents. 

Be careful with cyclic dependencies on required properties that will prevent you from deleting any data from the database.


```
mongoSchema.plugin(mongooseRefValidator, {
	onDeleteRestrict: ['tags']
});
```
