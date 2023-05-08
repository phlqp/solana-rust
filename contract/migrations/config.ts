export interface Config {
    mint: string,
    ownerTokenAccount: string,
}

export const testnetConfig: Config = {
    mint: 'GDEnhWE85VsHfRsfgppoCC99stB1yvRgDwAVWcRCh1Tt',
    ownerTokenAccount: 'wRxR8YAP9AhrRyE2JEtjPgyGGgtTqQL8Wn4vmMAdFH2',
};

export const localnetConfig: Config = {
    mint: '5sFaLm9EGHajpAGwZ8UA5MHWuv6MKkahhVcZgxbtrpkK',
    ownerTokenAccount: '2U1PJXHeAtk1PKi8ZhNDkJsT5PKN22w9eU58tgsq3cNu',
};