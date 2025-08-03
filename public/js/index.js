// For Parcel ; Set entry-point dist/index.js as a browser script, not Node.js. For that either can set targets OR Rename index.js to index.browser.js.
import { submitForm , logout , startAdjustedTimer } from "./user_settings.js" ;
import { uploadFiles , deleteFile } from "./file_handling.js";
import alertMsg from "./alert.js" ;

const signupForm = document.querySelector('.signup-form') ;
const loginForm = document.querySelector('.login-form') ;
const logoutBtn = document.getElementById('logout') ;
const uploadForm = document.querySelector('.upload-form') ;
const filesInput = document.getElementById('files') ;
const filesList = document.getElementById('file-list');
const filesLabel = document.querySelector('label[for="files"]');
const loader = document.querySelector('.div-loader') ;
const uploadsGrid = document.querySelector('.uploads-grid') ; // MISTAKE ; Attach the event listener to the COMMON parent element. WHICH is GRID not CARD.
const hasUser = document.body.dataset.user ;
let fileApiCalled = false ;

// * Only using setInterval() will work ONLY IF page is NOT refreshed OR routes NOT changed AS then index.js will be reloaded AND setInterval() is reset.
export function setLastRefresh( timestamp ) {
    localStorage.setItem( 'lastTokenRefresh' , timestamp ) ;
    // console.log( new Date( timestamp ).toLocaleTimeString() ) ;
}

export function getLastRefresh() {
    return parseInt( localStorage.getItem('lastTokenRefresh') ) || 0 ;
}

if( hasUser ) {
    if( !getLastRefresh() )
        setLastRefresh( Date.now() ) ;
    startAdjustedTimer() ;
}
else { // else if( timer ) wasn't working as timer resets on page reload.
    localStorage.removeItem( 'lastTokenRefresh' ) ;
}

if( signupForm ) {
    signupForm.addEventListener( 'submit' , async e => {
        e.preventDefault() ;
        const form = new FormData() ;
        const email = document.getElementById('email').value  ;
        if ( /[A-Z]/ .test(email) ) {
            alertMsg('Email should be in lowercase');
            return;
        }
        form.append( 'name' , document.getElementById('name').value ) ;
        form.append( 'email' , email ) ;
        form.append( 'password' , document.getElementById('password').value ) ;
        form.append( 'passwordConfirm' , document.getElementById('passwordConfirm').value ) ;
        form.append( 'photo' , document.getElementById('photo').files[0] ) ;
        // for ( let pair of form.entries() )      console.log(pair[0] + ': ' + pair[1] ) ;
        await submitForm( form , 'signup' ) ;
    } ) ;
}

if( loginForm ) {
    loginForm.addEventListener( 'submit' , async e => {
        e.preventDefault() ;
        const email = document.getElementById('email').value  ;
        const password = document.getElementById('password').value ;
        const remember = document.getElementsByName('remember')[0].checked ;
        await submitForm( { email , password } , 'login' ) ;
    } ) ;
}

if( logoutBtn ) {
    logoutBtn.addEventListener( 'click' , logout ) ;
}

async function handleUploadForm( ) {
    if( fileApiCalled ) return ;
    fileApiCalled = true ;

    loader.style.display = 'block' ;
    // console.log( filesInput.files ) ;  
    const maxSize = 5 * 1024 * 1024 ;
    const form = new FormData() ;

    for( const file of filesInput.files ) {
        if( file.size > maxSize ) {
            alertMsg( 'File size should be less than 5MB' ) ;
            loader.style.display = 'none' ;
            fileApiCalled = false ;
            return ;
        }
        form.append( 'files' , file ) ; // Directly appending all files into 1-field would accept 0 files i.e. [].
    }   

    try {
        await uploadFiles( form ) ; 
    }
    finally {
        filesList.value = '' ;
        loader.style.display = 'none' ;
        fileApiCalled = false ; // Doing this in "finally" will run this in last of response so UI will not stuck.
    }
}

function renderFileNames(files) {
    if ( !filesList )  return;

    if ( !files.length ) {
        filesList.innerHTML = '<p>No files selected</p>';
        return;
    }

    const list = Array.from(files).map( file => {
        const sizeMB = ( file.size / (1024 * 1024) ).toFixed(2) ;
        return `<li>${file.name} (${sizeMB} MB)</li>` ;
    } ) .join('') ;

    filesList.innerHTML = `<ul>${list}</ul>`;
}

if ( filesInput ) {
    filesInput.addEventListener('change', () => {
        renderFileNames( filesInput.files ) ; 
    } ) ;
}

if( uploadForm ) {
    filesLabel.addEventListener( 'dragover' , e => {
        e.preventDefault() ;
        filesLabel.classList.add('drag-over') ;
    } ) ;

    filesLabel.addEventListener( 'dragleave' , e => {
        if ( !filesLabel.contains(e.relatedTarget) ) // Only remove when cursor truly leaves the label.
            filesLabel.classList.remove('drag-over') ;
    } ) ;

    uploadForm.addEventListener('drop', async e => {
        e.preventDefault();
        filesLabel.classList.remove('drag-over') ;
        const filesInput = document.getElementById('files') ;
        filesInput.files = e.dataTransfer.files ;
        renderFileNames( filesInput.files ) ;
        await handleUploadForm( ) ;
    } ) ;

    uploadForm.addEventListener( 'submit' , async e => {
        e.preventDefault() ;
        await handleUploadForm( ) ;
    } ) ;
}

if( uploadsGrid ) {
    uploadsGrid.addEventListener( 'click' , async e => {
        const deleteBtn = e.target.closest('.btn-danger') ;
        if( deleteBtn ) {
            loader.style.display = 'block' ;
            const deleteId = deleteBtn.dataset.id ;
            await deleteFile( deleteId ) ;
            
            loader.style.display = 'none' ;
            const card = deleteBtn.closest('.upload-card') ;
            card.style.transition = 'opacity 0.3s';
            card.style.opacity = '0';
            setTimeout( () => card.remove(), 300 ) ;
        }
    } ) ;
}