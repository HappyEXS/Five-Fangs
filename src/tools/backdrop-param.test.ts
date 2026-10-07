import { describe, expect, it } from 'vitest';
import { backdropFromQuery } from './backdrop-param.ts';

describe('backdropFromQuery', () => {
  it('czyta znane tło z adresu', () => {
    expect(backdropFromQuery(new URLSearchParams('backdrop=swamps'))).toBe('swamps');
    expect(backdropFromQuery(new URLSearchParams('view=perf&backdrop=citadel'))).toBe('citadel');
  });

  it('bez parametru albo dla nieznanego tła zwraca null', () => {
    expect(backdropFromQuery(new URLSearchParams(''))).toBeNull();
    expect(backdropFromQuery(new URLSearchParams('backdrop=moon'))).toBeNull();
    expect(backdropFromQuery(new URLSearchParams('backdrop='))).toBeNull();
  });
});
