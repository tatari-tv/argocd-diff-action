import { 
    exceedsCommentLimit, 
    createTruncatedComment, 
    MAX_COMMENT_LENGTH,
    type ArtifactResult 
} from '../src/artifactUpload.js';

describe('artifactUpload basic functionality', () => {
    test('exceedsCommentLimit returns false for short content', () => {
        const shortContent = 'This is a short comment';
        expect(exceedsCommentLimit(shortContent)).toBe(false);
    });

    test('exceedsCommentLimit returns true for long content', () => {
        const longContent = 'x'.repeat(MAX_COMMENT_LENGTH + 1);
        expect(exceedsCommentLimit(longContent)).toBe(true);
    });

    test('exceedsCommentLimit handles edge case at exact limit', () => {
        const exactLimitContent = 'x'.repeat(MAX_COMMENT_LENGTH);
        expect(exceedsCommentLimit(exactLimitContent)).toBe(false);
    });

    test('createTruncatedComment generates correct format', () => {
        const header = '<!-- argocd-diff-action test.example.com -->\n## ArgoCD Diff test.example.com for commit [`abc1234`](http://example.com)';
        const timestamp = '_Updated at 2023-01-01, 12:00:00 p.m. PT_';
        const originalLength = 100000;
        const artifactResult: ArtifactResult = {
            name: 'argocd-diff-pr-123-20230101120000',
            id: 456,
            size: 50000,
            url: 'https://github.com/owner/repo/actions/runs/789'
        };
        const summaryContent = 'App: [`test-app`](http://example.com/applications/test-app)\nYAML generation: Success 🟢\nApp sync status: Synced ✅\n---';
        const legend = '| Legend | Status |\n| :---:  | :---   |\n| ✅     | Synced |';

        const result = createTruncatedComment(
            header,
            timestamp,
            originalLength,
            artifactResult,
            summaryContent,
            legend
        );

        expect(result).toContain('⚠️ **Diff report too large for comment (100,000 characters).**');
        expect(result).toContain('📁 **[Download full diff report](https://github.com/owner/repo/actions/runs/789)**');
        expect(result).toContain('(argocd-diff-pr-123-20230101120000, 49KB)');
        expect(result).toContain('_Look for the artifact named "argocd-diff-pr-123-20230101120000" in the Actions tab._');
        expect(result).toContain(summaryContent);
        expect(result).toContain(legend);
        expect(result).toContain(header);
        expect(result).toContain(timestamp);
    });

    test('createTruncatedComment handles small artifact size', () => {
        const artifactResult: ArtifactResult = {
            name: 'small-artifact',
            id: 1,
            size: 500,
            url: 'https://example.com'
        };

        const result = createTruncatedComment(
            'header',
            'timestamp',
            50000,
            artifactResult,
            'summary',
            'legend'
        );

        expect(result).toContain('(small-artifact, 0KB)'); // 500 bytes rounds to 0KB
    });

    test('MAX_COMMENT_LENGTH constant is correct', () => {
        expect(MAX_COMMENT_LENGTH).toBe(65536);
    });
});