import React, { ReactElement, Component, Fragment, ReactNode } from 'react';
import { types } from '@storybook/addons';
import { API, Consumer, Combo } from '@storybook/api';
import { styled } from '@storybook/theming';
import { STORY_RENDERED } from '@storybook/core-events';

import {
  SyntaxHighlighter as SyntaxHighlighterBase,
  Placeholder,
  DocumentFormatting,
  Link,
} from '@storybook/components';
import Giphy from './giphy';
import Markdown from 'markdown-to-jsx';

import { PARAM_KEY, Parameters } from './shared';

const Panel = styled.div({
  padding: '3rem 40px',
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: 980,
  margin: '0 auto',
});

interface Props {
  active: boolean;
  api: API;
}

interface State {
  value?: string;
}

function read(param: Parameters | undefined): string | undefined {
  if (!param) {
    return undefined;
  } else if (typeof param === 'string') {
    return param;
  } else if ('disabled' in param) {
    return undefined;
  } else if ('text' in param) {
    return param.text;
  } else if ('markdown' in param) {
    return param.markdown;
  }
}

interface SyntaxHighlighterProps {
  className?: string;
  children: ReactElement;
  [key: string]: any;
}
export const SyntaxHighlighter = ({ className, children, ...props }: SyntaxHighlighterProps) => {
  // markdown-to-jsx does not add className to inline code
  if (className) {
    return <code>{children}</code>;
  }
  // className: "lang-jsx"
  const language = className.split('-');
  return (
    <SyntaxHighlighterBase language={language[1] || 'plaintext'} bordered copyable {...props} />
  );
};

// use our SyntaxHighlighter component in place of a <code> element when
// converting markdown to react elements
const defaultOptions = {
  overrides: {
    code: SyntaxHighlighter,
    Giphy: {
      component: Giphy,
    },
  },
};

interface Overrides {
  overrides: {
    [type: string]: ReactNode;
  };
}
type Options = typeof defaultOptions & Overrides;

const mapper = ({ state, api }: Combo): { value?: string; options: Options } => {
  const extraElements = Object.entries(api.getElements(types.NOTES_ELEMENT)).reduce(
    (acc, [k, v]) => ({ ...acc, [k]: v.render }),
    {}
  );
  const options = {
    ...defaultOptions,
    overrides: { ...defaultOptions.overrides, ...extraElements },
  };

  const story = state.storiesHash[state.storyId];
  const value = read(story ? api.getParameters(story.id, PARAM_KEY) : undefined);

  return { options, value };
};

export default class NotesPanel extends Component<Props, State> {
  readonly state: State = {
    value: '',
  };

  mounted: boolean;

  componentDidMount() {
    const { api } = this.props;
    api.on(STORY_RENDERED, this.onStoryChange);
  }

  componentWillUnmount() {
    const { api } = this.props;
    api.off(STORY_RENDERED, this.onStoryChange);
  }

  onStoryChange = (id: string) => {
    const { api } = this.props;
    const params = api.getParameters(id, PARAM_KEY);

    const value = read(params);
    if (value) {
      this.setState({ value });
    } else {
      this.setState({ value: undefined });
    }
  };

  render() {
    const { active } = this.props;

    if (!active) {
      return null;
    }

    return (
      <Consumer filter={mapper}>
        {({ options, value }: { options: Options; value?: string }) => {
          return value ? (
            <Panel className="addon-notes-container">
              <DocumentFormatting>
                <Markdown options={options}>{value}</Markdown>
              </DocumentFormatting>
            </Panel>
          ) : (
            <Placeholder>
              <Fragment>No notes yet</Fragment>
              <Fragment>
                Learn how to{' '}
                <Link
                  href="https://github.com/storybooks/storybook/tree/master/addons/notes"
                  target="_blank"
                  withArrow
                >
                  document components in Markdown
                </Link>
              </Fragment>
            </Placeholder>
          );
        }}
      </Consumer>
    );
  }
}
