import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose, gql, graphql } from 'react-apollo';
import { Inbox as InboxComponent } from '../components';
import { queries, subscriptions } from '../graphql';

class Inbox extends Component {
  componentWillMount() {
    const { currentConversationId, conversationDetailQuery } = this.props;

    // lister for new message insertion
    conversationDetailQuery.subscribeToMore({
      document: gql(subscriptions.conversationMessageInserted),
      variables: { _id: currentConversationId },
      updateQuery: (prev, { subscriptionData }) => {
        const message = subscriptionData.data.conversationMessageInserted;
        const conversationDetail = prev.conversationDetail;
        const messages = conversationDetail.messages;

        // add new message to messages list
        const next = Object.assign({}, prev, {
          conversationDetail: Object.assign({
            ...conversationDetail,
            messages: [...messages, message]
          })
        });

        return next;
      }
    });

    // lister for conversation changes like status, assignee
    conversationDetailQuery.subscribeToMore({
      document: gql(subscriptions.conversationChanged),
      variables: { _id: currentConversationId },
      updateQuery: () => {
        this.props.conversationDetailQuery.refetch();
      }
    });
  }

  render() {
    const { conversationDetailQuery } = this.props;

    // =============== actions
    const changeStatus = () => {};

    const updatedProps = {
      ...this.props,
      currentConversation: conversationDetailQuery.conversationDetail,
      changeStatus
    };

    return <InboxComponent {...updatedProps} />;
  }
}

Inbox.propTypes = {
  conversationDetailQuery: PropTypes.object,
  currentConversationId: PropTypes.string.isRequired
};

const ConversationDetail = compose(
  graphql(gql(queries.conversationDetail), {
    name: 'conversationDetailQuery',
    options: ({ currentConversationId }) => {
      return {
        variables: { _id: currentConversationId }
      };
    }
  })
)(Inbox);

/*
 * Container with currentConversationId state
 */
class CurrentConversation extends Component {
  constructor(props) {
    super(props);

    this.state = { currentConversationId: props.currentConversationId };

    this.onChangeConversation = this.onChangeConversation.bind(this);
  }

  onChangeConversation(conversation) {
    this.setState({ currentConversationId: conversation._id });
  }

  render() {
    const updatedProps = {
      ...this.props,
      onChangeConversation: this.onChangeConversation,
      currentConversationId: this.state.currentConversationId
    };

    return <ConversationDetail {...updatedProps} />;
  }
}

CurrentConversation.propTypes = {
  currentConversationId: PropTypes.string.isRequired
};

/*
 * Container with last conversation query ====================
 */
const LastConversation = props => {
  const { queryParams, lastConversationQuery } = props;

  if (lastConversationQuery.loading) {
    return null;
  }

  const lastConversation = lastConversationQuery.conversationsGetLast;

  if (!lastConversation) {
    return null;
  }

  const currentConversationId = queryParams._id
    ? queryParams._id
    : lastConversation._id;

  const updatedProps = {
    ...this.props,
    currentConversationId
  };

  return <CurrentConversation {...updatedProps} />;
};

LastConversation.propTypes = {
  queryParams: PropTypes.object,
  lastConversationQuery: PropTypes.object
};

export default compose(
  graphql(gql(queries.lastConversation), {
    name: 'lastConversationQuery'
  })
)(LastConversation);
