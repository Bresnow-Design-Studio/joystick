var u=(e=null)=>({authenticated:"GET",user:"GET"})[e]||"POST",d=(e="")=>({authenticated:"authenticated",user:"user",signup:"signup",login:"login",logout:"logout",recoverPassword:"recover-password",resetPassword:"reset-password"})[e],i=(e="",a={})=>{if(fetch)return new Promise((c,r)=>{let s=u(e),l=d(e);return fetch(`${window.location.origin}/api/_accounts/${l}`,{method:s,mode:"cors",headers:{"Content-Type":"application/json"},body:s==="POST"?JSON.stringify({...a,origin:window?.location?.origin}):null,credentials:"include"}).then(async t=>{let o=await t.json();return o&&o.errors?(console.log(`%c\u274C accounts.${e} request failed with the following errors:`,'background-color: #ffcc00; padding: 7px; font-family: "Helvetica Neue", "Helvetica", "Arial", sans-serif; font-size: 11px; line-height: 10px; color: #000;'),o.errors.forEach(n=>{console.log(n.message),n.stack&&console.log(n.stack)}),r(o)):(c(o),o)}).catch(t=>(console.log(`%c\u274C accounts.${e} request failed with the following network error:`,'background-color: #ffcc00; padding: 7px; font-family: "Helvetica Neue", "Helvetica", "Arial", sans-serif; font-size: 15px; line-height: 15px; color: #000;'),console.log(t),r(t),t))})};var h=(e={})=>i("signup",e);export{h as default};
