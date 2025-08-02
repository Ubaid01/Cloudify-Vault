export const getOverview = ( req , res ) => {
    res.status(200).render( 'overview' ) ;
}

export const getSignup = ( req , res ) => {
    res.status(200).render( 'signup' ) ;
}

export const getLogin = ( req , res ) => {
    res.status(200).render( 'login' ) ;
}

export const getDashboard = async ( req , res ) => {
    res.status(200).render( 'dashboard' ) ;
} 