(() => {
  const commonPasswords=new Set([
    '12345678','123456789','1234567890','password','password1','password123','qwerty','qwerty123',
    'letmein','admin123','welcome1','iloveyou','abc12345','P@ssw0rd'.toLowerCase()
  ]);
  const orderedSequences=['0123','1234','2345','3456','4567','5678','6789','9876','8765','7654','6543','5432','4321','abcd','bcde','cdef','defg','efgh','qwer','asdf','zxcv'];
  function checkPassword(password){
    const value=String(password||''), normalized=value.toLowerCase(), hasValue=value.length>0;
    const repeated=/(.)\1{3,}/i.test(value);
    const sequence=orderedSequences.some(part=>normalized.includes(part));
    const tests={
      length:value.length>=8&&value.length<=20,
      upper:/[A-Z]/.test(value),
      digits:(value.match(/\d/g)||[]).length>=2,
      symbol:/[^A-Za-z0-9\s]/.test(value),
      common:hasValue&&!commonPasswords.has(normalized),
      pattern:hasValue&&!(repeated||sequence)
    };
    const core=['length','upper','digits','symbol','common'].every(key=>tests[key]);
    // A sequence is acceptable only if every other check passes; a blank field stays neutral/empty.
    tests.pattern=hasValue&&(!(repeated||sequence)||core);
    const score=Object.values(tests).filter(Boolean).length;
    const strong=core&&tests.pattern;
    const weak=!hasValue||commonPasswords.has(normalized)||((repeated||sequence)&&!core)||score<4;
    return{tests:{...tests},strong,level:strong?'strong':weak?'weak':'medium',score:Math.min(6,score)};
  }
  window.VirgaSecurity={checkPassword};
})();
