// Only allow same-site relative paths, so ?redirect= can't be used for open redirects
export const getSafeRedirect = (search) => {
    const target = new URLSearchParams(search).get('redirect');
    return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
};
