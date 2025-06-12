/**
 * GitHub Actions artifact upload for large ArgoCD diff reports
 */

import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { DefaultArtifactClient } from '@actions/artifact';

export const MAX_COMMENT_LENGTH = 65536;

export interface ArtifactResult {
    name: string;
    id: number;
    size: number;
    url: string;
}

/**
 * Creates a GitHub Actions artifact with the full diff content
 */
export async function createDiffArtifact(
    content: string,
    prNumber: number,
    timestamp: string,
): Promise<ArtifactResult> {
    try {
        const sanitizedTimestamp = timestamp.replace(/[^0-9]/g, '');
        const artifactName = `argocd-diff-pr-${prNumber}-${sanitizedTimestamp}`;
        const fileName = `${artifactName}.md`;
        const filePath = path.join(process.cwd(), fileName);
        
        // Write content to file
        fs.writeFileSync(filePath, content, 'utf8');
        
        // Upload as artifact using Actions toolkit
        const artifactClient = new DefaultArtifactClient();
        
        const uploadResponse = await artifactClient.uploadArtifact(
            artifactName,
            [filePath],
            process.cwd(),
            {
                retentionDays: 30,
            }
        );
        
        // Clean up temporary file
        fs.unlinkSync(filePath);
        
        const runId = process.env.GITHUB_RUN_ID;
        const repository = process.env.GITHUB_REPOSITORY;
        const artifactUrl = `https://github.com/${repository}/actions/runs/${runId}`;
        
        return {
            name: artifactName,
            id: uploadResponse.id || 0,
            size: uploadResponse.size || 0,
            url: artifactUrl,
        };
    }
    catch (error) {
        throw new Error(`Failed to create diff artifact: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Generates the truncated comment content with link to artifact
 */
export function createTruncatedComment(
    header: string,
    timestamp: string,
    originalLength: number,
    artifactResult: ArtifactResult,
    summaryContent: string,
    legend: string,
): string {
    const sizeInKB = Math.round(artifactResult.size / 1024);
    return `${header}
${timestamp}

⚠️ **Diff report too large for comment (${originalLength.toLocaleString()} characters).**
📁 **[Download full diff report](${artifactResult.url})** (${artifactResult.name}, ${sizeInKB}KB)

_Look for the artifact named "${artifactResult.name}" in the Actions tab._

${summaryContent}

${legend}`;
}

/**
 * Checks if content exceeds GitHub comment length limit
 */
export function exceedsCommentLimit(content: string): boolean {
    return content.length > MAX_COMMENT_LENGTH;
}