// Normalize AI-generated file content
export function normalizeContent(content) {
    if (!content) return "";

    // Remove BOM if present
    if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
    }

    // Normalize Windows line endings
    content = content
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

    /*
     * AI models sometimes return escaped characters literally
     * instead of returning the actual characters.
     *
     * Example:
     *
     * onClick={() => setIsOpen(false)}\n
     * className="text-base hover\:text-indigo-600"
     *
     * should become:
     *
     * onClick={() => setIsOpen(false)}
     * className="text-base hover:text-indigo-600"
     */

    // Convert literal \n into actual newlines
    content = content.replace(/\\n/g, "\n");

    // Convert literal \t into actual tabs
    content = content.replace(/\\t/g, "\t");

    // Remove literal escaped carriage returns
    content = content.replace(/\\r/g, "");

    /*
     * AI sometimes escapes colons in Tailwind classes:
     *
     * hover\:text-red-500
     *
     * should be:
     *
     * hover:text-red-500
     */
    content = content.replace(/\\:/g, ":");

    /*
     * Fix escaped quotes used in JSX attributes:
     *
     * className=\"relative\"
     *
     * becomes:
     *
     * className="relative"
     */
    content = content.replace(
        /(\w+)=\\"([^"]*?)\\"/g,
        '$1="$2"'
    );

    return content;
}