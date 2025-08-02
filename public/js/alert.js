export default function alertMsg( msg , status = 'info', duration = 3000 ) {
    if ( !msg ) 
        return ;

    const existing = document.getElementById('flash-alert') ;
    if ( existing ) existing.remove() ;

    const alert = document.createElement('div');
    alert.className = `alert alert-${status}` ;
    alert.id = 'flash-alert' ;
    alert.style.setProperty('--duration', `${ duration / 10 }ms`) ; // 0.3s.

    const span = document.createElement('span') ;
    span.textContent = msg ;

    alert.appendChild(span) ;
    document.body.appendChild(alert) ;

    setTimeout( () => alert.classList.add('fade-out') , duration - 500 ) ;
    setTimeout( () => alert.remove() , duration ) ;
}
