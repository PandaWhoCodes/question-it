/* eslint-disable no-restricted-syntax, guard-for-in, prefer-const */

export class User {
  constructor(obj) {
    for (let prop in obj) {
      this[prop] = obj[prop];
    }
  }
}

export class Poll {
  constructor(obj) {
    for (let prop in obj) {
      this[prop] = obj[prop];
    }
  }
}

export class Vote {
  constructor(obj) {
    for (let prop in obj) {
      this[prop] = obj[prop];
    }
  }
}

import data from './data';

let { users, polls, votes } = data;

users = users.map((user) => new User(user));

polls = polls.map((poll) => new Poll(poll));

votes = votes.map((vote) => new Vote(vote));

/*
const users = [];
for (let i = 0; i < 5; i++) {
  const user = new User();
  user.email = `email${i}@email.com`;
  user.username = `MyUsername${i}`;
  user.password = '1234';
  user._id = `${i}`;
  user.votes = [];
  user.polls = [];
  users.push(user);
}

const polls = [];
for (let i = 0; i < 8; i++) {
  const poll = new Poll();
  poll._id = `${i}`;
  poll.title = `Poll ${i} Title`;
  const optionsNum = 2 + Math.floor(Math.random() * 3);
  poll.options = [];
  for (let j = 0; j < optionsNum; j++) {
    poll.options.push(`Poll ${i} Option ${j}`);
  }
  poll.votes = [];
  const author = Math.floor(Math.random() * users.length);
  poll.author = `${author}`;
  users[author].polls.push(`${i}`);
  poll.timestamp = new Date();
  polls.push(poll);
}

const votes = [];
for (let i = 0; i < users.length; i++) {
  for (let j = 0; j < polls.length; j++) {
    const vote = new Vote();
    vote._id = `${(i + 1) * (j + 1) - 1}`;
    const poll = polls[j];
    const user = users[i];
    user.votes.push(`${vote._id}`);
    poll.votes.push(`${vote._id}`);
    vote.user = `${user._id}`;
    vote.poll = `${poll._id}`;
    vote.vote = `${Math.floor(Math.random() * poll.options.length)}`;
    vote.timestamp = new Date();
    votes.push(vote);
  }
}
*/


export function getViewer() {
  return users[0];
}

export function getUser(id) {
  return users[id - 1];
}

export function getUsers() {
  return users;
}

export function getPoll(id) {
  return polls[id - 1];
}

export function getPolls(orderBy = 1) {
  return orderPolls(polls, orderBy);
}

export function getVote(id) {
  return votes[id - 1];
}

export function getVotes() {
  return votes;
}

export function getUserPolls(id, orderBy = 1) {
  return orderPolls(polls.filter((poll) => poll.author === id), orderBy);
}

export function getUserVotes(id) {
  return votes.filter((vote) => vote.user === id);
}

export function getPollAuthor(id) {
  return users[polls[id - 1].author - 1];
}

export function getPollVotes(id) {
  return votes.filter((vote) => vote.poll === id);
}

export function getVoteUser(id) {
  return users[votes[id - 1].user - 1];
}

export function getVotePoll(id) {
  return polls[votes[id - 1].poll - 1];
}

function sortByTime(a, b) {
  return a.timestamp <= b.timestamp;
}

function orderPolls(unordered, orderBy) {
  switch (orderBy) {
    case 2:
      return newPolls(unordered);
    case 3:
      return topPolls(unordered);
    case 1:
    default:
      return trendingPolls(unordered);
  }
}

function topPolls(unordered) {
  return unordered.sort((pA, pB) => pA.votes.length <= pB.votes.length);
}

function newPolls(unordered) {
  return unordered.sort(sortByTime);
}

function trendingPolls(unordered) {
  return unordered.sort((pA, pB) => {
    const vA = pA.votes;
    const vB = pB.votes;
    vA.sort(sortByTime);
    vB.sort(sortByTime);
    return vA.timestamp >= vB.timestamp;
  });
}