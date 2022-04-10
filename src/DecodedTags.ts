export class DecodingResult {
    numberOfRFUs = 0;
    private static readonly INDENT_SIZE = 5;

    private result = "";
    private indentLevel = 0;

    getResult(): string {
        return this.result;
    }

    addToString(newString: string): void {
        const indent = (this.indentLevel && this.indentLevel < 20) ? "                    ".slice(0, this.indentLevel) : "";
        this.result += `${indent}${newString}\n`;
    }

    increaseIndent(): void {
        this.indentLevel += DecodingResult.INDENT_SIZE;
    }

    decreaseIndent(): void {
        this.indentLevel -= DecodingResult.INDENT_SIZE;
    }
}
