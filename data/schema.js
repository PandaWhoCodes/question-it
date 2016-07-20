/* eslint-disable comma-dangle, no-use-before-define, no-shadow, no-underscore-dangle */
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLID,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLString,
  GraphQLList,
  GraphQLEnumType
} from 'graphql';

import GraphQLDate from 'graphql-custom-datetype';

import {
  connectionArgs,
  connectionDefinitions,
  // cursorForObjectInConnection,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions
  // toGlobalId
} from 'graphql-relay';

import {
  connectionFromMongooseQuery,
  connectionFromMongooseAggregate
} from './connectionFromMongoose';

import * as db from './database.js';

/* eslint-enable comma-dangle */

class Store {}

const store = new Store();

const { nodeInterface, nodeField } = nodeDefinitions(
  (globalId) => {
    const { type, id } = fromGlobalId(globalId);
    if (type === 'Poll') {
      return db.getPoll(id);
    }
    else if (type === 'User') {
      return db.getUser(id);
    }
    else if (type === 'Vote') {
      return db.getVote(id);
    }
    else if (type === 'Store') {
      return store;
    }
    return null;
  },
  (obj) => {
    const type = obj.constructor.modelName;
    if (type === 'Poll') {
      return pollType;
    }
    else if (type === 'User') {
      return userType;
    }
    else if (type === 'Vote') {
      return voteType;
    }
    else if (obj instanceof Store) {
      return storeType;
    }
    return null;
  }
);

function privateFieldType(field, type) {
  const name = field[0].toUpperCase() + field.substr(1);
  return {
    type: new GraphQLObjectType({
      name,
      fields: (() => ({
        value: {
          type,
        },
        public: {
          type: GraphQLBoolean,
        },
      })),
    }),
    resolve: ((user, args, { viewerId }) => {
      const isPublic = user[field].public;
      const value = isPublic || viewerId === user._id ? user[field].value : null;
      return {
        value,
        public: isPublic,
      };
    }),
  };
}

const pollSortEnum = new GraphQLEnumType({
  name: 'PollSort',
  description: 'Sorting parameters for polls',
  values: {
    TRENDING: {
      value: 1,
      description: 'Trending polls: polls with the most recent votes.',
    },
    RECENT: {
      value: 2,
      description: 'Newest polls: polls that were recently created.',
    },
    TOP: {
      value: 3,
      description: 'Most voted polls',
    },
  },
});

const userType = new GraphQLObjectType({
  name: 'User',
  description: 'Registered user',
  fields: (() => ({
    id: globalIdField('User', user => user._id),
    username: {
      type: new GraphQLNonNull(GraphQLString),
    },
    email: {
      type: new GraphQLNonNull(GraphQLString),
    },
    password: {
      type: new GraphQLNonNull(GraphQLString),
    },
    avatar: {
      type: GraphQLString,
    },
    bio: {
      type: GraphQLString,
    },
    birthDate: privateFieldType('birthDate', GraphQLDate),
    name: privateFieldType('name', GraphQLString),
    votes: {
      type: voteConnectionType,
      args: connectionArgs,
      async resolve(user, args) {
        const { query, aggregate, map, transform } = db.getUserVotes(user._id, false);
        if (query) {
          return await connectionFromMongooseQuery(query, args, map, transform);
        }
        return await connectionFromMongooseAggregate(aggregate, args, map, transform);
      },
    },
    voteCount: {
      type: GraphQLInt,
      resolve: (user => db.countUserVotes(user.id)),
    },
    recievedVotesCount: {
      type: GraphQLInt,
      resolve: (user => db.countUserRecievedVotes(user._id)),
    },
    polls: {
      type: pollConnectionType,
      args: {
        orderBy: {
          type: pollSortEnum,
        },
        ...connectionArgs,
      },
      async resolve(user, { orderBy, ...args }) {
        const { query, aggregate, map, transform } = db.getUserPolls(user._id, orderBy, false);
        if (query) {
          return await connectionFromMongooseQuery(query, args, map, transform);
        }
        return await connectionFromMongooseAggregate(aggregate, args, map, transform);
      },
    },
    pollCount: {
      type: GraphQLInt,
      resolve: (user => db.countUserPolls(user._id)),
    },
    createdAt: {
      type: new GraphQLNonNull(GraphQLDate),
    },
    updatedAt: {
      type: new GraphQLNonNull(GraphQLDate),
    },
  })),
  interfaces: [nodeInterface],
});

const pollType = new GraphQLObjectType({
  name: 'Poll',
  description: 'Poll which can be voted by registered users',
  fields: (() => ({
    id: globalIdField('Poll', poll => poll._id),
    title: {
      type: new GraphQLNonNull(GraphQLString),
    },
    multi: {
      type: GraphQLBoolean,
    },
    options: {
      type: new GraphQLNonNull(new GraphQLList(GraphQLString)),
    },
    author: {
      type: new GraphQLNonNull(userType),
      resolve: ((poll) => db.getPollAuthor(poll._id)),
    },
    votes: {
      type: voteConnectionType,
      args: connectionArgs,
      async resolve(poll, args) {
        const { query, aggregate, map, transform } = db.getPollVotes(poll._id, false);
        if (query) {
          return await connectionFromMongooseQuery(query, args, map, transform);
        }
        return await connectionFromMongooseAggregate(aggregate, args, map, transform);
      },
    },
    voteCount: {
      type: GraphQLInt,
      resolve: (poll => db.countPollVotes(poll._id)),
    },
    createdAt: {
      type: new GraphQLNonNull(GraphQLDate),
    },
    updatedAt: {
      type: new GraphQLNonNull(GraphQLDate),
    },
  })),
  interfaces: [nodeInterface],
});

const {
  connectionType: pollConnectionType,
  edgeType: pollEdgeType,
} = connectionDefinitions({
  name: 'Poll',
  nodeType: pollType,
});

const voteType = new GraphQLObjectType({
  name: 'Vote',
  description: 'User vote on a poll',
  fields: (() => ({
    id: globalIdField('Vote', vote => vote._id),
    user: {
      type: new GraphQLNonNull(userType),
      resolve: ((vote) => db.getVoteUser(vote._id)),
    },
    poll: {
      type: new GraphQLNonNull(pollType),
      resolve: ((vote) => db.getVotePoll(vote._id)),
    },
    options: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLInt))),
    },
    createdAt: {
      type: new GraphQLNonNull(GraphQLDate),
    },
    updatedAt: {
      type: new GraphQLNonNull(GraphQLDate),
    },
  })),
  interfaces: [nodeInterface],
});

const {
  connectionType: voteConnectionType,
  edgeType: voteEdgeType,
} = connectionDefinitions({
  name: 'Vote',
  nodeType: voteType,
});

const storeType = new GraphQLObjectType({
  name: 'Store',
  fields: (() => ({
    id: globalIdField('Store'),
    votes: {
      type: voteConnectionType,
      args: connectionArgs,
      async resolve(store, args) {
        const { query, aggregate, map, transform } = db.getVotes({}, false);
        if (query) {
          return await connectionFromMongooseQuery(query, args, map, transform);
        }
        return await connectionFromMongooseAggregate(aggregate, args, map, transform);
      },
    },
    voteCount: {
      type: GraphQLInt,
      resolve: (() => db.countVotes()),
    },
    pollCount: {
      type: GraphQLInt,
      resolve: (() => db.countPolls()),
    },
    polls: {
      type: pollConnectionType,
      args: {
        ...connectionArgs,
        orderBy: {
          type: pollSortEnum,
        },
        query: {
          type: GraphQLString,
        },
      },
      async resolve(store, { orderBy, query, ...args }) {
        const q = query ? { title: new RegExp(query, 'i') } : {};
        const { query: _query, aggregate, map, transform } = db.getPolls(q, orderBy, false);
        if (_query) {
          return await connectionFromMongooseQuery(_query, args, map, transform);
        }
        return await connectionFromMongooseAggregate(aggregate, args, map, transform);
      },
    },
  })),
  interfaces: [nodeInterface],
});

const Root = new GraphQLObjectType({
  name: 'Root',
  fields: (() => ({
    node: nodeField,
    viewer: {
      type: userType,
      resolve: ((root, args, { viewerId }) => db.getUser(viewerId)),
    },
    store: {
      type: storeType,
      resolve: (() => store),
    },
  })),
});

const CreatePollMutation = mutationWithClientMutationId({
  name: 'CreatePoll',

  inputFields: {
    title: {
      type: new GraphQLNonNull(GraphQLString),
    },
    multi: {
      type: GraphQLBoolean,
    },
    options: {
      type: new GraphQLNonNull(new GraphQLList(GraphQLString)),
    },
    author: {
      type: new GraphQLNonNull(GraphQLID),
    },
  },

  outputFields: {
    pollEdge: {
      type: pollEdgeType,
      resolve: (poll => (
        {
          cursor: 0,
          node: poll,
        }
      )),
    },
    viewer: {
      type: userType,
      resolve: ((root, args, { viewerId }) => db.getUser(viewerId)),
    },
    store: {
      type: storeType,
      resolve: (() => store),
    },
  },

  mutateAndGetPayload: ({ title, multi, options, author }) => {
    const { id: authorId } = fromGlobalId(author);
    return db.createPoll(title, options, authorId, multi);
  },

});

const CreateVoteMutation = mutationWithClientMutationId({
  name: 'VotePoll',
  
  inputFields: {
    poll: {
      type: new GraphQLNonNull(GraphQLID),
    },
    user: {
      type: new GraphQLNonNull(GraphQLID),
    },
    options: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLInt))),
    },
  },
  
  outputFields: {
    voteEdge: {
      type: voteEdgeType,
      resolve: (({ voteId }) => {
        const vote = db.getVote(voteId);
        return {
          cursor: 0,
          node: vote,
        };
      }),
    },
    viewer: {
      type: userType,
      resolve: ((root, args, { viewerId }) => db.getUser(viewerId)),
    },
    store: {
      type: storeType,
      resolve: (() => store),
    },
    poll: {
      type: pollType,
      resolve: (({ pollId }) => db.getPoll(pollId)),
    },
  },
  
  mutateAndGetPayload: ({ poll, user, options }) => {
    const { id: pollId } = fromGlobalId(poll);
    const { id: userId } = fromGlobalId(user);
    return new Promise((resolve, reject) => {
      db.createVote(userId, pollId, options).then(vote => resolve({
        voteId: vote.id,
        pollId,
      })).catch(reject);
    });
  },
  
});

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createPoll: CreatePollMutation,
    votePoll: CreateVoteMutation,
  },
});

const schema = new GraphQLSchema({
  query: Root,
  mutation: Mutation,
});

export default schema;
