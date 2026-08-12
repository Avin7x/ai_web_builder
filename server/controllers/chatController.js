import { version } from "mongoose";
import { Project } from "../models/Project.model.js";
import { reviseProject } from "../services/ai.js";
import { applyOperations } from "../services/diff.js";


export function buildManifest(files) {
    const manifest = [];
    for(const [path, entry] of Object.entries(files)){
        manifest.push({path, hash: entry.hash, size: entry.content.length});
    }
    return manifest;
}


// POST /api/projects/:id/chat
// Send a revision prompt and return updated project
export async function chat(req, res) {
    const { prompt } = req.body;
    if(!prompt || typeof prompt !== 'string'){
        return res.status(400).json({error: "Prompt is required"});
    }

    if(!req.user){
        return res.status(401).json({error: "Unauthorized"});
    }

    const project = await Project.findOne({_id: req.params.id, owner: req.user.userId});

    if(!project) {
        return res.status(404).json({error: "Project not found"});
    }

    // Set status to revising and save user prompt immediately.
    project.status = "revising";
    project.messages.push({
        role: "user",
        content: prompt,
        timestamp: new Date()
    });
    await project.save();

    try {
        // Build compact manifest ( path + hash + size ) instead of sending all code
        const manifest = buildManifest(project.files);

        // Include ALL file contents so that AI can do accurate search/replace
        const relevantFiles = {};
        for(const [path, entry] of Object.entries(project.files)){
            relevantFiles[path] = entry.content;
        }

        // Recent messages for context (last 4 max)
        const recentMessages = project.messages.slice(-4).map((m) => ({
            role: m.role,
            content: m.content
        }));

        console.log(`[AI] Revising project ${project._id}: "${prompt.slice(0, 80)}..."` + `(${manifest.length} files, manifest ~${JSON.stringify(manifest).length} chars)`);

        // Call AI with manifest + relevant files
        const result = await reviseProject(prompt, manifest, relevantFiles, recentMessages);

        console.log(`[AI] Got ${result.operations.length} operations: ${result.description}`);

        // Apple operations to file map
        const { files: updatedFiles, applied, errors } = applyOperations(project.files, result.operations);

        if(errors.length > 0) {
            console.warn(`[Diff] Errors applying operations:`, errors);
        }

        // Update project in DB
        project.files = updatedFiles;
        project.markModified("files");
        project.version += 1;
        project.status = "completed";
        project.messages.push({
            role: "assistant",
            content: result.description + (errors.length > 0 ? `\n\n Some operations failed: ${errors.join(", ")}`: ""),
        });

        await project.save();

        // Return upated project
        const filesObj = {};
        for(const [path, entry] of Object.entries(project.files)) {
            filesObj[path] = entry.content;
        }

        res.json({
            _id: project._id,
            name: project.name,
            description: project.description,
            files: filesObj,
            messages: project.messages,
            version: project.version,
            status: project.status,
            applied,
            errors,
            aiDescription: result.description
        })
    } catch (error) {
        console.error(`[AI REVISION ERROR] ${error.message}`);
        project.status = "completed";
        await project.save();
        res.status(500).json({ error: error.message || "Failed to process revision request"});
    }
}