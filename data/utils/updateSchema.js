require('babel-register');

const fs = require('fs');
const path = require('path');
const Schema = require('../schema');
const graphql = require('graphql').graphql;
const introspectionQuery = require('graphql/utilities').introspectionQuery;
const printSchema = require('graphql/utilities').printSchema;

const buildLocation = path.join(__dirname, '..', '..', 'build');

if (!fs.existsSync(buildLocation)) {
  fs.mkdirSync(buildLocation);
}

(() => {
  graphql(Schema, introspectionQuery).then((result) => {
    if (result.errors) {
      console.error('Error inspecting schema: ', JSON.stringify(result.errors, null, 2));
    }
    else {
      fs.writeFileSync(path.join(buildLocation, 'schema.json'), JSON.stringify(result, null, 2));
    }
  });

  fs.writeFileSync(path.join(buildLocation, 'schema.graphql'), printSchema(Schema));
})();
