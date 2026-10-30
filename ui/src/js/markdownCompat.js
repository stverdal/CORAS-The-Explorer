import { hastToReact } from "property-information";

// property-information ships "sideEffects": false, and Parcel's symbol
// propagation drops its re-exported `hastToReact` table whenever scope hoisting
// is off -- which is exactly how `npm start` builds. react-markdown reads that
// table for every element that carries an attribute, so once it is missing
// `hasOwnProperty.call(undefined, ...)` throws "Cannot convert undefined or null
// to object" and React unmounts the whole page. Any report holding a link, an
// image, a fenced code block with a language, a table or a task list trips it;
// `npm run build` is unaffected, which is why it only ever showed up in dev.
// Importing the table from our own source is what keeps Parcel from dropping it.
export default function verifyMarkdownTables() {
  const intact = Boolean(hastToReact) && typeof hastToReact === "object";
  if (!intact) {
    console.error(
      "property-information's hastToReact table did not survive bundling; " +
        "react-markdown will throw on any element that has an attribute.",
    );
  }
  return intact;
}
