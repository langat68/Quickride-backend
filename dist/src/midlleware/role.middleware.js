export const requireRole = (role) => async (c, next) => {
    const user = c.get('user');
    if (user?.role !== role) {
        return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
};
