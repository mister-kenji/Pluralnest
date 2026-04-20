import { MarkdownIt } from "react-native-markdown-display";

const mdParser = MarkdownIt({ typographer: true, linkify: false });

mdParser.validateLink = () => true;

export default mdParser;
