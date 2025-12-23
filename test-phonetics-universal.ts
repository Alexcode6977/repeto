import { applyPhoneticCorrections } from './lib/speech-utils.ts';

const tests = [
    { input: "Comment est-il ?", expected: "Comman è-til ?" },
    { input: "Peut-être qu'il viendra.", expected: "peut-ètre qu'il viendra." },
    { input: "Hélas ! Je suis content.", expected: "Hélâsse ! Je suis contan." },
    { input: "Vas-y, allons-y !", expected: "vazi, allon-zi !" },
    { input: "Comment allez-vous ?", expected: "Comman allez-vous ?" }
];

console.log("--- Universal Phonetic Fixes Test ---");
tests.forEach(({ input, expected }, i) => {
    const result = applyPhoneticCorrections(input);
    const passed = result.toLowerCase().includes(expected.toLowerCase());
    console.log(`${i + 1}. [${passed ? 'PASS' : 'FAIL'}]`);
    console.log(`   Input:    ${input}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Result:   ${result}`);
});
