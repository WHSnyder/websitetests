class Player {

    constructor(){

        this.eyePt = vec3.fromValues(-4.0,0.0,0.0);
        this.focusVec = vec3.fromValues(0.0,0.0,40.0);
        this.upVec = vec3.fromValues(0.0,1.0,0.0);
        this.focusCoord = vec3.create();
        
        this.lookMat = mat4.create();
        this.rot = mat4.create();
        this.tran = mat4.create();

        this.left = vec3.fromValues(1.0,0.0,0.0)
    }

    rotate(axis, deg){

        mat4.fromRotation(this.rot, deg, axis);

        vec3.transformMat4(this.upVec, this.upVec, this.rot);
        vec3.transformMat4(this.left, this.left, this.rot);
        vec3.transformMat4(this.focusVec, this.focusVec, this.rot); //probably wrong...
    }

    move(x,y,z){

        console.log("b4: " + this.eyePt);
        vec3.add(this.eyePt, this.eyePt, vec3.fromValues(x,y,z));
        console.log("af: " + this.eyePt);
    }

    getView(){

        vec3.add(this.focusCoord, this.eyePt, this.focusVec);
        mat4.lookAt(this.lookMat, this.eyePt, this.focusCoord, this.upVec);

        return this.lookMat;
    }

    getUp(){
        return this.upVec;
    }
}





var player = new Player();