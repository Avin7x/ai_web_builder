import crypto from "crypto";

export function hashContent(content) {
    return crypto
        .createHash("md5")
        .update(content)
        .digest("hex")
        .slice(0, 12);
}

// Apply AI file operations (create, update, delete) to project files
export function applyOperations(currentFiles, operations) {
    const files = { ...currentFiles };
    const applied = [];
    const errors = [];

    for (const op of operations) {
        try {
            // Normalize path so "App.js" and "/App.js" are treated the same
            const path = op.path?.startsWith("/")
                ? op.path
                : `/${op.path}`;

            switch (op.op) {
                case "create": {
                    if (op.content == null) {
                        errors.push(`create ${path}: missing content`);
                        break;
                    }

                    if (files[path]) {
                        errors.push(`create ${path}: file already exists`);
                        break;
                    }

                    files[path] = {
                        content: op.content,
                        hash: hashContent(op.content),
                    };

                    applied.push(`created ${path}`);
                    break;
                }

                case "update": {
    const existing = files[path];

    if (!existing) {
        errors.push(`update ${path}: file not found`);
        break;
    }

    // Preferred: replace the complete file
    if (op.content != null) {
        files[path] = {
            content: op.content,
            hash: hashContent(op.content),
        };

        applied.push(`updated ${path}`);
        break;
    }

    // Fallback: search/replace
    if (!op.search || op.replace == null) {
        errors.push(
            `update ${path}: missing content or search/replace`
        );
        break;
    }

    const newContent = searchReplace(
        existing.content,
        op.search,
        op.replace
    );

    if (newContent === null) {
        errors.push(
            `update ${path}: search string not found`
        );
        break;
    }

    files[path] = {
        content: newContent,
        hash: hashContent(newContent),
    };

    applied.push(`updated ${path}`);
    break;
}

                case "delete": {
                    if (files[path]) {
                        delete files[path];
                        applied.push(`deleted ${path}`);
                    } else {
                        errors.push(
                            `delete ${path}: file not found`
                        );
                    }

                    break;
                }

                default:
                    errors.push(`unknown op: ${op.op}`);
            }
        } catch (err) {
            errors.push(
                `${op.op} ${op.path}: ${err.message}`
            );
        }
    }

    return {
        files,
        applied,
        errors,
    };
}

// Search and replace code with fallback whitespace normalization matching
function searchReplace(content, search, replace) {
    // 1. Try exact match
    if (content.includes(search)) {
        return content.replace(search, () => replace);
    }

    // 2. Try with normalized whitespace
    // Collapse multiple spaces/tabs and trim each line
    const normalizeWs = (s) =>
        s
            .split("\n")
            .map((line) => line.replace(/\s+/g, " ").trim())
            .join("\n")
            .trim();

    const normalizedContent = normalizeWs(content);
    const normalizedSearch = normalizeWs(search);

    if (normalizedContent.includes(normalizedSearch)) {
        // Find the original substring by matching line-by-line
        const searchLines = normalizedSearch.split("\n");
        const contentLines = content.split("\n");

        for (
            let i = 0;
            i <= contentLines.length - searchLines.length;
            i++
        ) {
            let match = true;

            for (let j = 0; j < searchLines.length; j++) {
                if (
                    normalizeWs(contentLines[i + j]) !==
                    searchLines[j]
                ) {
                    match = false;
                    break;
                }
            }

            if (match) {
            const before = contentLines.slice(0, i);
            const after = contentLines.slice(
                i + searchLines.length
            );
            return [...before, replace, ...after].join("\n");
        }
        }
    }

    return null;
}