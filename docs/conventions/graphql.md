# Graphql Conventions:
## Global rules:
All names are camelCase

## Hasura tables:
### spec:
- match SQL methods

### Root FieldsCustom:
- Select               -> selectMany${Table}
- Select by PK         -> selectOne${Table}
- Select Aggregate     -> selectAgg${Table}
- Select Stream        -> selectStream${Table}
- Insert/Upsert        -> insertMany${Table}
- Insert/Upsert One    -> insertOne${Table}
- Update               -> updateMany${Table}
- Update Many          -> updateBatch${Table}
- Update One           -> updateOne${Table}
- Delete               -> deleteMany${Table}
- Delete One           -> deleteOne${Table}

### Relations naming:
- one                  -> one${Table}
- many                 -> many${Table}
- one named link       -> one${Table}As${LinkName}
- many named link      -> many${Table}As${LinkName}
- one by foreign key   -> one${Table}By${ForeignKey}
- many by foreign key  -> many${Table}By${ForeignKey}

### Enum tables naming:
- enum_${Type=ColumnName}
- enum_${Table}_${Type=ColumnName}
columns:
- value (primary)
- label (optional)

### Columns:
GraphQL field name: camelCase(${column})

### Computed Columns:
- PostgreSQL function name: computed_${table_name}__${column_name}


## API Remote Schema:
### spec:
- avoid collisions with hasura
- match HTTP methods
- match REST paths

### Root Fields:
- ${DataName}.post.js          -> POST   /${DataName}      -> addOne${DataName}
- ${DataName}/{id}.get.js      -> GET    /${DataName}/{id} -> getOne${DataName} 
- ${DataName}/{id}.sub.js      -> GET    /${DataName}/{id} -> ${DataName} 
- ${DataName}/{id}.put.js      -> PUT    /${DataName}/{id} -> setOne${DataName}
- ${DataName}/{id}.delete.js   -> DELETE /${DataName}/{id} -> delOne${DataName}
- ${DataName}/index.post.js    -> POST   /${DataName}/     -> addMany${DataName}
- ${DataName}/index.get.js     -> GET    /${DataName}/     -> getMany${DataName}
- ${DataName}/index.sub.js     -> GET    /${DataName}/     -> subMany${DataName}
- ${DataName}/index.put.js     -> PUT    /${DataName}/     -> setMany${DataName}
- ${DataName}/index.delete.js  -> DELETE /${DataName}/     -> delMany${DataName}
- ${ActionName}.patch.js       -> PATCH  /${ActionName}    -> do${ActionName}

### Async Api:

- ${DataName}.chan/index.sub.js  -> WS  /${ChannelName}    -> subMany${ChannelName}
- ${DataName}.chan/index.pub.js  -> WS  /${ChannelName}    -> pubMany${ChannelName}
- ${DataName}.chan/{id}.sub.js   -> WS  /${ChannelName}    -> subOne${ChannelName}
- ${DataName}.chan/{id}.pub.js   -> WS  /${ChannelName}    -> pubOne${ChannelName}
- ${ChannelName}.chan/${OperationName}.sub.js  -> WS  /${ChannelName}    -> ${OperationName}${ChannelName}
- ${ChannelName}.chan/${OperationName}.pub.js  -> WS  /${ChannelName}    -> ${OperationName}${ChannelName}
